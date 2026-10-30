
const GUILD_STORAGE_KEY = 'people.guild-memberships.v1';
const GUILD_PROPOSALS_KEY = 'people.guild-proposals.v1';
const GUILD_REQUESTS_KEY = 'people.guild-membership-requests.v1';

const defaultGuilds = [
  {
    id: 'women-in-tech',
    icon: '👩‍💻',
    name: 'Women in Tech',
    description: 
    'Build connections, share experiences, and support women across technology.',
    lead: 'Vera Kassandra',
    members: 24
  },
  {
    id: 'architecture-review',
    icon: '🏛️',
    name: 'Architecture Review Board',
    description: 'Discuss system design, technical standards, and architectural decisions.',
    lead: 'Lubowa Najeeb',
    members: 18
  },
  {
    id: 'global-design',
    icon: '🎨',
    name: 'Global Design Guild',
    description:
      'Share design practices and create more consistent, accessible experiences.',
    lead: 'Napier Jacquese ',
    members: 16
  }
];

function readLocalJSON(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function saveLocalJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    setStatus(
      'Could not save changes. Check your browser storage settings.'
    );
    return false;
  }
}

const memberships = readLocalJSON(GUILD_STORAGE_KEY, {});
const guildRequests = readLocalJSON(GUILD_REQUESTS_KEY, []);
const guildProposals = readLocalJSON(GUILD_PROPOSALS_KEY, []);

const guildGrid = document.querySelector('#guild-grid');
const guildStatus = document.querySelector('#guild-status');

const membershipDialog = document.querySelector(
  '#guild-membership-dialog'
);
const membershipForm = document.querySelector(
  '#guild-membership-form'
);
const membershipTitle = document.querySelector(
  '#guild-membership-title'
);
const membershipMessage = document.querySelector(
  '#guild-membership-message'
);
const confirmMembershipButton = document.querySelector(
  '#confirm-membership-action'
);
const cancelMembershipButton = document.querySelector(
  '#cancel-membership-action'
);

const proposalDialog = document.querySelector(
  '#propose-guild-dialog'
);
const proposalForm = document.querySelector(
  '#propose-guild-form'
);

let selectedGuild = null;
let selectedAction = null;

function setStatus(message) {
  if (guildStatus) {
    guildStatus.textContent = message;
  }
}

function getGuildById(id) {
  return defaultGuilds.find(guild => guild.id === id);
}

function getPendingRequest(guildId) {
  return guildRequests.find(
    request =>
      request.guildId === guildId &&
      request.status === 'pending'
  );
}

function isMember(guildId) {
  return memberships[guildId] === true;
}

function getMemberCount(guild) {
  return guild.members + (isMember(guild.id) ? 1 : 0);
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;

  return element;
}

function persistRequests() {
  return saveLocalJSON(GUILD_REQUESTS_KEY, guildRequests);
}

function persistMemberships() {
  return saveLocalJSON(GUILD_STORAGE_KEY, memberships);
}

// -------------------- Guild cards --------------------

function renderGuilds() {
  if (!guildGrid) return;

  const cards = defaultGuilds.map(guild => {
    const card = createElement('article', 'guild-card');

    const icon = createElement(
      'div',
      'guild-icon',
      guild.icon
    );
    icon.setAttribute('aria-hidden', 'true');

    const name = createElement('h3', 'guild-name', guild.name);
    const description = createElement(
      'p',
      'guild-description',
      guild.description
    );
    const lead = createElement(
      'p',
      'guild-lead',
      `Group lead: ${guild.lead}`
    );
    const count = createElement(
      'p',
      'guild-member-count',
      `${getMemberCount(guild)} members`
    );

    const action = createElement('button', 'guild-action');
    action.type = 'button';

    const pending = getPendingRequest(guild.id);

    if (isMember(guild.id)) {
      action.textContent = 'Leave Group';
      action.addEventListener('click', () => {
        openMembershipDialog(guild, 'leave');
      });
    } else if (pending) {
      action.textContent = 'Request Pending';
      action.disabled = true;
      action.setAttribute('aria-label', `Membership request pending for ${guild.name}`);
    } else {
      action.textContent = 'Join Group';
      action.addEventListener('click', () => {
        openMembershipDialog(guild, 'join');
      });
    }

    card.append(icon, name, description, lead, count, action);
    return card;
  });

  guildGrid.replaceChildren(...cards);
  renderAdminRequests();
}

// -------------------- Join / Leave confirmation --------------------

function openMembershipDialog(guild, action) {
  if (!membershipDialog || !membershipForm) {
    setStatus('The membership confirmation dialog is missing.');
    return;
  }

  selectedGuild = guild;
  selectedAction = action;

  membershipTitle.textContent =
    action === 'join' ? 'Request to Join Group' : 'Leave Group?';

  membershipMessage.textContent =
    action === 'join'
      ? `Request to join ${guild.name}? Your request must be approved by an admin before you become a member.`
      : `Are you sure you want to leave ${guild.name}? Your local demo membership will be removed.`;

  confirmMembershipButton.textContent =
    action === 'join' ? 'Submit Request' : 'Yes, Leave Group';

  membershipDialog.showModal();
}

function closeMembershipDialog() {
  if (membershipDialog?.open) {
    membershipDialog.close();
  }

  selectedGuild = null;
  selectedAction = null;
}

cancelMembershipButton?.addEventListener(
  'click',
  closeMembershipDialog
);

membershipDialog?.addEventListener('click', event => {
  if (event.target === membershipDialog) {
    closeMembershipDialog();
  }
});

membershipForm?.addEventListener('submit', event => {
  event.preventDefault();

  if (!selectedGuild || !selectedAction) return;

  const guild = selectedGuild;
  const action = selectedAction;

  // Recheck the state when confirming to prevent duplicate requests.
  if (action === 'join') {
    if (isMember(guild.id)) {
      closeMembershipDialog();
      renderGuilds();
      setStatus(`You are already a member of ${guild.name}.`);
      return;
    }

    if (getPendingRequest(guild.id)) {
      closeMembershipDialog();
      renderGuilds();
      setStatus(`Your request for ${guild.name} is already pending.`);
      return;
    }

    const request = {
      id: `request-${Date.now()}-${guild.id}`,
      guildId: guild.id,
      guildName: guild.name,
      status: 'pending',
      requestedAt: new Date().toISOString()
    };

    guildRequests.push(request);

    if (!persistRequests()) {
      guildRequests.pop();
      return;
    }

    closeMembershipDialog();
    renderGuilds();
    setStatus(
      `Your request to join ${guild.name} was submitted. Await admin approval.`
    );
    return;
  }

  if (action === 'leave') {
    if (!isMember(guild.id)) {
      closeMembershipDialog();
      renderGuilds();
      return;
    }

    // Preserve the previous state if persistence fails.
    const previousMembership = memberships[guild.id];
    delete memberships[guild.id];

    if (!persistMemberships()) {
      memberships[guild.id] = previousMembership;
      return;
    }

    closeMembershipDialog();
    renderGuilds();
    setStatus(`You have left ${guild.name}.`);
  }
});

// -------------------- Demo admin approval panel --------------------

function renderAdminRequests() {
  
}

// -------------------- Propose a new guild --------------------

document.querySelector('#propose-guild-btn')?.addEventListener('click', () => {
  proposalDialog?.showModal();
});

document.querySelector('#cancel-guild-proposal')?.addEventListener('click', () => {
  proposalDialog?.close();
});

proposalDialog?.addEventListener('click', event => {
  if (event.target === proposalDialog) {
    proposalDialog.close();
  }
});

proposalForm?.addEventListener('submit', event => {
  event.preventDefault();

  if (!proposalForm.reportValidity()) return;

  const formData = new FormData(proposalForm);

  const proposal = {
    id: `proposal-${Date.now()}`,
    name: String(formData.get('name') || '').trim(),
    purpose: String(formData.get('purpose') || '').trim(),
    lead: String(formData.get('lead') || '').trim(),
    status: 'pending-review',
    submittedAt: new Date().toISOString()
  };

  if (!proposal.name || !proposal.purpose || !proposal.lead) return;

  guildProposals.push(proposal);

  if (!saveLocalJSON(GUILD_PROPOSALS_KEY, guildProposals)) {
    guildProposals.pop();
    return;
  }

  proposalDialog.close();
  proposalForm.reset();

  setStatus(
    `Proposal for "${proposal.name}" saved for review. It has not been published.`
  );
});

renderGuilds();
