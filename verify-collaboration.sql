begin;
create temp table collab_test_ids(owner_id uuid, member_id uuid, outsider_id uuid);
insert into collab_test_ids select (select user_id from public.directory_site_owners limit 1),gen_random_uuid(),gen_random_uuid();
insert into auth.users(id,email)select member_id,'chat-access-test@example.com' from collab_test_ids union all select outsider_id,'chat-outsider-test@example.com' from collab_test_ids;
insert into public.directory_chat_members(user_id,employee_id)
select t.member_id,e.id from collab_test_ids t cross join lateral(select id from public.employees where id not in(select employee_id from public.directory_chat_members)limit 1)e;
insert into public.directory_chat_members(user_id,employee_id)
select t.outsider_id,e.id from collab_test_ids t cross join lateral(select id from public.employees where id not in(select employee_id from public.directory_chat_members)limit 1)e;
grant select on collab_test_ids to authenticated;
select set_config('chat.test_banned_id',(select id::text from auth.users where banned_until>now() limit 1),true);
set local role authenticated;
select set_config('request.jwt.claim.sub',(select member_id::text from collab_test_ids),true);
do $$
declare count_rows int;
begin
 if not directory_private.is_chat_member() then raise exception 'Invited member denied';end if;
 insert into public.directory_messages(sender_id,recipient_id,body)select member_id,owner_id,'Access verification (rolled back)'from collab_test_ids;
 if (select count(*)from public.directory_messages)=0 then raise exception 'Own message missing';end if;
 begin
  insert into public.directory_messages(sender_id,recipient_id,body)select owner_id,member_id,'Spoofed sender'from collab_test_ids;
  raise exception 'Sender spoof accepted';
 exception when insufficient_privilege then null;end;
 update public.employees set name=name;
 get diagnostics count_rows=row_count;if count_rows<>0 then raise exception 'Invited member edited employees';end if;
 update public.directory_chat_members set active=false where user_id=(select owner_id from collab_test_ids);
 get diagnostics count_rows=row_count;if count_rows<>0 then raise exception 'Invited member changed access';end if;
 insert into public.directory_meetings(organizer_id,guest_id,start_at,end_at)select member_id,owner_id,now()+interval '1 day',now()+interval '1 day 1 hour'from collab_test_ids;
end $$;
select set_config('request.jwt.claim.sub',(select outsider_id::text from collab_test_ids),true);
do $$begin
 if (select count(*)from public.directory_messages)<>0 then raise exception 'Outsider read messages';end if;
 if (select count(*)from public.directory_meetings)<>0 then raise exception 'Outsider read meetings';end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('chat.test_banned_id'),true);
do $$begin
 if (select count(*)from public.directory_chat_members)<>0 then raise exception 'Nonmember read chat members';end if;
 begin
  insert into public.directory_messages(sender_id,recipient_id,body)select outsider_id,owner_id,'Unauthorized'from collab_test_ids;
  raise exception 'Outsider sent a message';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select json_build_object('rls_tests','passed; all test data rolled back','active_members',(select count(*)from public.directory_chat_members where active),'messages',(select count(*)from public.directory_messages),'meetings',(select count(*)from public.directory_meetings)) as verification;
