/* Shared data access. The publishable key identifies the app; RLS authorizes each write. */
(function () {
    'use strict';
    const config = window.DIRECTORY_CONFIG;
    if (!config || !window.supabase) return;
    const client = window.supabase.createClient(config.url, config.publishableKey, {
        auth: { storageKey: 'employee-directory-admin', persistSession: true, autoRefreshToken: true }
    });
    const bucket = 'employee-photos';
    const columns = 'id,name,title,department,location,region,country,time_zone,email,image,bio,skills,linkedin,github,portfolio,joining_date,created_at,updated_at';
    const photoPrefix = `${config.url}/storage/v1/object/public/${bucket}/`;

    function check(result) {
        if (result.error) throw result.error;
        return result.data;
    }
    function mapEmployee(row) { return { ...row, locationRaw: row.location, location: [row.location, row.region, row.country].filter(Boolean).join(', '), timeZone: row.time_zone || '', joiningDate: row.joining_date }; }
    function safeUrl(value) {
        if (!value) return '';
        const url = new URL(value);
        if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
            throw new Error('Links must use an http:// or https:// address.');
        }
        return url.href;
    }
    function cleanEmployee(input) {
        const result = {};
        for (const field of ['name', 'title', 'department', 'location', 'region', 'country', 'email', 'bio']) {
            result[field] = String(input[field] || '').trim();
        }
        if (!result.name || !result.title || !result.department || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) {
            throw new Error('Enter a name, role, department, and valid email address.');
        }
        for (const field of ['image', 'linkedin', 'github', 'portfolio']) result[field] = safeUrl(String(input[field] || '').trim());
        result.skills = (Array.isArray(input.skills) ? input.skills : []).map(s => String(s).trim()).filter(Boolean);
        if (result.skills.length > 20 || result.skills.some(s => s.length > 80)) throw new Error('Use up to 20 skills, with at most 80 characters each.');
        if (result.location.length > 160) throw new Error('Use at most 160 characters for location.');
        if (result.region.length > 100 || result.country.length > 100) throw new Error('Use at most 100 characters for region and country.');
        result.time_zone = String(input.timeZone || '').trim();
        if (result.time_zone) { try { new Intl.DateTimeFormat('en-US', {timeZone: result.time_zone}); } catch { throw new Error('Choose a valid time zone.'); } }
        result.joining_date = input.joiningDate || null;
        result.updated_at = new Date().toISOString();
        return result;
    }

    window.EmployeeStore = Object.freeze({
        async list() {
            return check(await client.from('employees').select(columns).order('name')).map(mapEmployee);
        },
        async getHeroVisibility() {
            return check(await client.from('directory_site_features').select('enabled').eq('key', 'search_hero').single()).enabled;
        },
        async isSiteOwner() {
            const { data, error } = await client.auth.getUser();
            if (error || !data.user) return false;
            const rows = check(await client.from('directory_site_owners').select('user_id').eq('user_id', data.user.id));
            return rows.length === 1;
        },
        async setHeroVisibility(enabled) {
            return check(await client.from('directory_site_features').update({ enabled: Boolean(enabled) }).eq('key', 'search_hero').select('enabled').single()).enabled;
        },
        async getAdmin() {
            const { data, error } = await client.auth.getUser();
            if (error || !data.user) return null;
            const rows = check(await client.from('directory_admins').select('user_id').eq('user_id', data.user.id));
            return rows.length ? data.user : null;
        },
        async signIn(email, password) { return check(await client.auth.signInWithPassword({ email, password })); },
        async signOut() { return check(await client.auth.signOut()); },
        onAuthChange(callback) {
            return client.auth.onAuthStateChange(() => { setTimeout(callback, 0); });
        },
        async save(input, existing) {
            const payload = cleanEmployee(input);
            let query;
            if (existing) {
                query = client.from('employees').update(payload).eq('id', existing.id).eq('updated_at', existing.updated_at);
            } else {
                query = client.from('employees').insert(payload);
            }
            const result = await query.select(columns).single();
            if (result.error?.code === 'PGRST116') throw new Error('This employee changed in another session. Reload the employees and try again.');
            return mapEmployee(check(result));
        },
        async remove(employee) {
            const result = await client.from('employees').delete().eq('id', employee.id).eq('updated_at', employee.updated_at).select('id').single();
            if (result.error?.code === 'PGRST116') throw new Error('This employee changed in another session. Reload the employees and try again.');
            check(result);
        },
        async uploadPhoto(file) {
            const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
            if (!extensions[file.type] || file.size > 2097152) throw new Error('Choose a JPG, PNG, or WebP photo smaller than 2 MB.');
            const path = `${crypto.randomUUID()}.${extensions[file.type]}`;
            check(await client.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false }));
            return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
        },
        async removePhotoIfUnused(url) {
            if (!url || !url.startsWith(photoPrefix)) return;
            const matches = check(await client.from('employees').select('id').eq('image', url).limit(1));
            if (!matches.length) check(await client.storage.from(bucket).remove([decodeURIComponent(url.slice(photoPrefix.length))]));
        }
    });
})();
