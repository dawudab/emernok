// Reference language. Every other file must define the same keys; the dev
// build warns when one is missing.
export default {
  'common.close': 'Close',
  'common.cancel': 'Cancel',
  'common.dismiss': 'Dismiss',
  'common.signIn': 'Sign in',
  'common.signOut': 'Sign out',
  'common.working': 'Working…',
  'common.send': 'Send',
  'common.approve': 'Approve',
  'common.reject': 'Reject',
  'common.publish': 'Publish',
  'common.discard': 'Discard',

  'app.city': 'N.E.M.',
  'app.counts': '{verified} verified · {total} active',

  'menu.label': 'Menu',
  'menu.guest': 'Guest',
  'menu.signedIn': 'Signed in',
  'menu.browsing': 'Browsing as guest',
  'menu.unverified': 'Unverified',
  'menu.statusVerified': 'Verified — full access',
  'menu.statusGuest': 'Viewing only. Sign in to report, post and vote.',
  'menu.statusUnverified': 'Verify your email to unlock reporting.',
  'menu.community': 'Community feed',
  'menu.communityOpen': 'Neighbours within {km}km',
  'menu.communityLocked': 'Read only until you sign in',
  'menu.myReports': 'My reports',
  'menu.signInHint': 'Email link or phone number',
  'menu.recenter': 'Centre on my location',
  'menu.recenterOff': 'Location unavailable',
  'menu.legend': 'Map legend',
  'menu.about': 'How it works',
  'menu.aboutHint': 'Reporting rules and limits',
  'menu.install': 'Install app',
  'menu.language': 'Language',
  'menu.official': 'Utility worker access',
  'menu.officialHint': 'Staff and trusted reporters',
  'menu.admin': 'Review queue',

  'type.power': 'Report Power',
  'type.power.short': 'Power outage',
  'type.water': 'Report Water',
  'type.water.short': 'Water issue',
  'type.fuel': 'Report Fuel',
  'type.fuel.short': 'Gas / fuel shortage',

  'bar.label': 'Report an outage',
  'bar.lockedGuest': 'Sign in with email or phone to report an outage',
  'bar.lockedUnverified': 'Verify your email address to report an outage',

  'notice.signInToPost': 'Sign in with your email or phone number to post.',
  'notice.verifyToPost': 'Verify your email address to post.',
  'notice.reported': '{type} reported. Thank you.',
  'notice.saveFailed': 'Could not save the report: {message}',
  'notice.tapMap': 'Location unavailable. Tap the map to place your {type} pin.',
  'notice.finishingSignIn': 'Finishing your sign-in…',
  'notice.linkNeedsStep': 'Your sign-in link needs one more step. Tap to finish.',
  'notice.liveUnavailable': 'Live updates unavailable: {message}',
  'notice.voteThanks': 'Thanks for confirming.',

  'popup.verified': 'Verified Community Outage',
  'popup.unconfirmed': 'Unconfirmed · {count}/{total} neighbours',
  'popup.latest': 'Latest: {time}',
  'popup.tally': '{out} still out · {back} back on',
  'popup.stillOut': 'Still Out',
  'popup.back': 'It\u2019s Back',
  'popup.voted': 'Thanks — your response was recorded.',
  'popup.signInToVote': 'Sign in with email or phone to respond.',
  'popup.sending': 'Sending…',

  'community.title': 'Neighbourhood',
  'community.subtitle': 'Messages within {km}km of you',
  'community.needLocation':
    'Location is needed to show nearby messages. Enable location access and reopen this panel.',
  'community.loadFailed': 'Could not load messages: {message}',
  'community.empty': 'No messages nearby yet. Start the conversation.',
  'community.placeholder': 'Did anyone else hear the transformer blow?',
  'community.signIn': 'Sign in to post',
  'community.verify': 'Verify your email to post',
  'community.away': '{distance} away',

  'profile.title': 'Your profile',
  'profile.guest': 'Guest account',
  'profile.anonymous': 'Anonymous session on this device only',
  'profile.fullAccess': 'Verified — you can report, post and vote',
  'profile.notVerified': 'Signed in, not yet verified',
  'profile.official': 'Verified {org} account',
  'profile.copyId': 'Copy my ID',
  'profile.copied': 'Copied',
  'profile.latest': 'Your latest reports',
  'profile.dailyLimit': 'Up to {limit} reports per day.',
  'profile.loadFailed': 'Could not load your reports: {message}',
  'profile.noReports': 'You have not sent any reports yet.',
  'profile.verifyTitle': 'Verify {email} to start reporting',
  'profile.verifyBody':
    'Reporting, posting and voting stay locked until the address is confirmed.',
  'profile.verifyCheck': 'I have verified',
  'profile.verifyStill': 'Checked — still not verified.',

  'signIn.title': 'Sign in to report, post and vote',
  'signIn.subtitle':
    'Your existing reports stay with you when you sign in from this device.',
  'signIn.google': 'Continue with Google',
  'signIn.or': 'or',
  'signIn.email': 'Email',
  'signIn.phone': 'Phone',
  'signIn.emailLabel': 'Email address',
  'signIn.emailPlaceholder': 'you@example.com',
  'signIn.sendLink': 'Send sign-in link',
  'signIn.linkSent':
    'We sent a sign-in link to {email}. Open it on this device to finish.',
  'signIn.linkHelp':
    'No password needed. Opening the link proves the address is yours, so reporting unlocks straight away.',
  'signIn.useAnother': 'Use a different method',
  'signIn.confirmAddress':
    'Confirm the email address this sign-in link was sent to.',
  'signIn.finish': 'Finish sign-in',
  'signIn.finishing': 'Finishing…',

  'phone.label': 'Phone number',
  'phone.placeholder': '+222 12 34 56 78',
  'phone.send': 'Send code',
  'phone.sending': 'Sending…',
  'phone.codeLabel': 'Enter the 6-digit code sent to {phone}',
  'phone.verify': 'Verify',
  'phone.verifying': 'Verifying…',
  'phone.change': 'Use a different number',
  'phone.keep': 'Your existing reports stay with you when you add a phone number.',

  'legend.title': 'Map legend',
  'legend.colourTitle': 'Circle colour',
  'legend.colourIntro':
    'Colour shows how confirmed an outage is, not which utility it is.',
  'legend.unconfirmed': 'Unconfirmed',
  'legend.unconfirmedBody':
    'fewer than {total} people have reported it. Treat it as a rumour.',
  'legend.verified': 'Verified Community Outage',
  'legend.verifiedBody':
    '{total} different people within {radius}m reported the same problem.',
  'legend.officialTitle': 'Official notice',
  'legend.officialBody':
    'Posted by a verified utility worker or trusted reporter, shown with a banner at the top of the map.',
  'legend.iconTitle': 'Pin icon',
  'legend.youTitle': 'Your position',
  'legend.youBody':
    'The small blue dot is you. It is never saved or shared — only the outages you choose to report are.',

  'about.title': 'How it works',
  'about.reportTitle': 'Reporting',
  'about.reportBody':
    'Tap a button at the bottom to report an outage right at your current location.',
  'about.expiryTitle': 'Why reports disappear',
  'about.expiryBody':
    'Outages are news, not history. Pins drop off the map after {hours} hours, or sooner once {restored} neighbours confirm service is back.',
  'about.voteTitle': 'Confirming and clearing',
  'about.voteBody':
    'Tap any outage and choose Still Out or It\u2019s Back. One vote per person per outage, and a vote cannot be changed — that is what keeps the count honest.',
  'about.feedTitle': 'Community feed',
  'about.feedBody':
    'Messages are only visible to people within {km}km, so the feed stays about your own neighbourhood.',
  'about.limitsTitle': 'Limits',
  'about.limitsBody':
    'Anyone can read the map. Reporting, posting and voting need a verified email or phone number, with one report every {cooldown} seconds and up to {limit} per day. These limits are enforced on the server, not just in the app.',

  'connection.connected': 'Connected',
  'connection.connecting': 'Connecting…',
  'connection.error': 'Connection problem',
  'connection.noKeys': 'No Firebase keys',

  'install.button': 'Install App',
  'install.title': 'Add to Home Screen',
  'install.step1': 'Tap the Share icon at the bottom of Safari.',
  'install.step2': 'Scroll down and choose Add to Home Screen.',
  'install.step3': 'Tap Add to confirm.',
  'install.note': 'Installing only works in Safari on iOS, not Chrome or Firefox.',
  'install.gotIt': 'Got it',

  'official.title': 'Utility worker access',
  'official.intro':
    'Staff of the electricity or water company, and trusted local reporters, can post official notices that appear as a banner on the map.',
  'official.signedOut': 'Sign in first, then apply from this screen.',
  'official.orgLabel': 'Organisation',
  'official.orgPlaceholder': 'SOMELEC, SNDE, press…',
  'official.nameLabel': 'Your full name',
  'official.roleLabel': 'Your role',
  'official.rolePlaceholder': 'Network technician, journalist…',
  'official.proofLabel': 'How can we verify you?',
  'official.proofPlaceholder':
    'Work email, staff number, a colleague who can vouch for you…',
  'official.submit': 'Apply for access',
  'official.pending':
    'Your application is being reviewed. You will get access once a moderator approves it.',
  'official.rejected':
    'Your application was not approved. Contact the team if you think this is a mistake.',
  'official.approved': 'You are verified as {org}. You can post official notices.',
  'official.postTitle': 'Post an official notice',
  'official.areaLabel': 'Neighbourhood',
  'official.messageLabel': 'Message',
  'official.messagePlaceholder':
    'Main line repair in Tevragh Zeina, estimated 4 hours.',
  'official.durationLabel': 'Expected duration (hours)',
  'official.post': 'Publish notice',
  'official.posted': 'Notice published.',

  'banner.official': 'Official notice',
  'banner.from': '{org} · {area}',
  'banner.until': 'Expected until {time}',

  'admin.title': 'Review queue',
  'admin.applications': 'Access applications',
  'admin.noApplications': 'No applications waiting.',
  'admin.drafts': 'Imported from official sources',
  'admin.noDrafts': 'Nothing imported recently.',
  'admin.source': 'Source: {source}',

  'location.asking': 'Finding your location…',
  'location.title': 'Share your location',
  'location.why':
    'The map centres on you and shows what is happening in your neighbourhood. Your position is never saved or shared.',
  'location.enable': 'Enable location',
  'location.retry': 'Try again',
  'location.later': 'Not now',
  'location.blocked':
    'Location is blocked for this site. Allow it in your browser settings for this page, then try again.',
  'location.timeout': 'Finding your location took too long.',
  'location.unavailable':
    'Your location could not be determined right now. You can still tap the map to place a report.',
  'location.unsupported':
    'This browser cannot provide a location. Tap the map to place a report instead.',

  'error.cooldown': 'Please wait {seconds}s before sending another report.',
  'error.dailyLimit':
    'Daily limit of {limit} reports reached. Try again later.',
  'error.alreadyVoted': 'You already responded to this report.',

  'station.available': 'Gas available',
  'station.shortage': 'Out of gas',
  'station.hasGas': 'Has Gas',
  'station.noGas': 'No Gas',
  'station.tally': '{has} has gas · {out} no gas',
  'station.directions': 'Get Directions',
  'station.directionsShort': 'Directions',
  'map.myLocation': 'My location',
  'map.gasStations': 'Toggle gas stations',
  'map.zoomIn': 'Zoom in',
  'map.zoomOut': 'Zoom out',

  'filter.verificationLabel': 'Filter by verification status',
  'filter.all': 'All',
  'filter.verified': 'Verified',
  'filter.unverified': 'Unverified',
  'filter.timeLabel': 'Filter by time window',
  'filter.fuelStations': 'Top Fuel Stations',
  'filter.regions': 'Regions',

  'settings.title': 'Settings',
  'settings.verificationFilter': 'Verification Filter',

  'region.sectionTitle': 'Nouakchott Regions',
  'region.hoverHint': 'Tap a region on the map for power & fuel stats',
  'region.powerLevel': 'Grid Power Level',
  'region.outages': '{verified} verified · {total} active outages',
  'region.gasStations': 'Top Fuel Stations',
  'region.gasSummary': '{has}/{total} with gas',
  'region.status.normal': 'Normal',
  'region.status.warning': 'Partial Disruption',
  'region.status.critical': 'Major Disruption',

  'report.fabLabel': 'Report Power Outage',
  'report.fabSub': 'Auto-captures your current GPS location',
  'report.modalTitle': 'Report Power Outage',
  'report.gpsCaptured': 'GPS locked: {lat}, {lng}',
  'report.detailsLabel': 'Outage details (optional)',
  'report.detailsPlaceholder':
    'E.g., transformer issue, street lights out since 2 PM…',
  'report.submitNow': 'Submit Report',
  'report.delete': 'Delete report',
  'notice.reportDeleted': 'Report deleted.',
  'profile.statTotal': 'Reported',
  'profile.statVerified': 'Verified',
  'profile.statResolved': 'Resolved',
  'profile.statusResolved': 'Resolved',
  'profile.statusVerified': 'Verified',
  'profile.statusPending': 'Unconfirmed ({count}/{total})',
  'profile.viewOnMap': 'Map',
  'menu.yourProfile': 'Your Profile',
  'menu.yourProfileHint': 'Reported outages & status',
  'menu.signOut': 'Sign Out',

  'walkthrough.badge': 'Interactive Guide',
  'walkthrough.title': 'Vision, Purpose & How to Use',
  'walkthrough.tab.overview': 'Overview',
  'walkthrough.tab.purpose': 'Purpose',
  'walkthrough.tab.vision': 'Vision',
  'walkthrough.tab.howto': 'How to Use',
  'walkthrough.prev': 'Back',
  'walkthrough.next': 'Next',
  'walkthrough.done': 'Explore Map',

  'walkthrough.overview.kicker': 'Nouakchott Energy Map · N.E.M.',
  'walkthrough.overview.lead':
    'Decentralizing infrastructure awareness across Nouakchott.',
  'walkthrough.overview.body':
    '“Nouakchott Energy Map” or N.E.M. decentralizes infrastructure awareness in Nouakchott, transforming unpredictable utility failures into visible, manageable data. By shifting the power of information from slow official channels to the everyday people on the ground, the system prevents a localized power cut from cascading into a household crisis.',
  'walkthrough.stat.power': 'Live Grid',
  'walkthrough.stat.fuel': 'Top Stations',
  'walkthrough.stat.regions': '9 Regions',

  'walkthrough.purpose.heading': 'The Purpose: Community Resilience',
  'walkthrough.purpose.sub':
    'The core objective is to give time and agency back to the residents.',
  'walkthrough.purpose.p1Title': 'Protecting Essentials',
  'walkthrough.purpose.p1Body':
    'When power drops for multiple days, refrigerated food spoils, medicine goes bad, and water pumps stop working. By visualizing a verified outage as it spreads across neighborhoods, families can pivot instantly—securing water or rerouting to working gas stations before localized panic drains the supply.',
  'walkthrough.purpose.p2Title': 'Bypassing Bureaucracy',
  'walkthrough.purpose.p2Body':
    'Centralized utility updates often lag behind reality. This system relies entirely on peer-to-peer verification, turning residents into a distributed, real-time sensor network that doesn’t wait for a government press release to know the lights are out.',
  'walkthrough.purpose.p3Title': 'Zero-Friction Accessibility',
  'walkthrough.purpose.p3Body':
    'Emergencies require immediate action. Eliminating app store downloads, user accounts, and passwords ensures that anyone with a browser can drop a pin in seconds.',

  'walkthrough.vision.heading': 'The Vision: A Digital Nervous System for the City',
  'walkthrough.vision.lead':
    'The app is designed to feel less like a traditional social network and more like a high-end, vital instrument for the city.',
  'walkthrough.vision.civicTitle': 'A Foundation for Civic Tech',
  'walkthrough.vision.civicBody':
    'Built on a lightweight React and Firebase architecture, the system is designed to handle sudden traffic spikes when a grid sector fails. Because it maps real-time working infrastructure, it lays the groundwork for future expansions—such as integrating with local on-demand delivery platforms to route emergency supplies, food, or resources to neighborhoods currently in the dark.',
  'walkthrough.vision.closing':
    'Ultimately, the app serves as a communal source of truth. It validates the frustration of frequent outages by making them visible, while simultaneously providing the exact data everyday people need to navigate them safely.',

  'walkthrough.howto.heading': 'How to Use & Key Features',
  'walkthrough.howto.f1Title': '1. Report a Power Outage (Corner ⚡ Button)',
  'walkthrough.howto.f1Body':
    'Tap the lightning bolt in the bottom-right corner to automatically capture your GPS coordinates, add optional details, and post a live report.',
  'walkthrough.howto.f2Title': '2. Click Any Region for Live Grid & Fuel Stats',
  'walkthrough.howto.f2Body':
    'Nouakchott’s 9 regions are carved seamlessly across the map. Click any region to see its overall status, Grid Power Level (%), and top fuel stations.',
  'walkthrough.howto.f3Title': '3. Top Fuel Stations & Turn-by-Turn Directions',
  'walkthrough.howto.f3Body':
    'Click any fuel station pin to report Has Gas or No Gas, check review ratings, or tap Get Directions to open navigation in your maps app.',
  'walkthrough.howto.f4Title': '4. Your Profile & Peer Verification',
  'walkthrough.howto.f4Body':
    '3 distinct neighbours within 500m verify an outage (turning it red). Unverified reports older than 24h auto-delete. Open Your Profile from the menu to track or delete your reports.',

  'region.uptime': '7d Uptime',
  'region.trendTitle': '7-Day Uptime & Outage Trend',
  'region.trendUptime': 'Uptime %',
  'region.trendOutages': 'Outages',
  'region.lastOutage': 'Last outage',
  'region.noRecentOutage': 'None in last 7d',
  'region.maintenance': 'Maintenance',
  'region.noMaintenance': 'None reported',
  'region.neighbourhoods': 'Neighbourhoods (Quartiers)',

  'station.thresholdHint': '{out}/{min} No Gas reports (needs >10 to mark Out)',

  'report.modeLabel': 'Outage Timing',
  'report.modeCurrent': 'Current Outage',
  'report.modePast': 'Past Outage (≤7d)',
  'report.dateTimeLabel': 'Outage Date & Time',
  'report.durationPastLabel': 'How long did it last? (hours)',
  'report.durationCurrentLabel': 'Ongoing duration estimate (hours)',
  'report.causeLabel': 'Outage Type',
  'report.causeUnplanned': 'Power Failure',
  'report.causeMaintenance': 'Maintenance',

  'profile.statusPast': 'Past Outage',

  'community.scope.radius': 'Radius',
  'community.scope.neighbourhood': 'Quartier',
  'community.scope.region': 'Region',
  'community.scope.global': 'City-Wide',
  'community.radiusLabel': 'Reach people within radius:',
  'community.desc.radius': 'Public chat within {km}km of your location · 3d history',
  'community.desc.neighbourhood': 'Neighbourhood chat · {name} · 3d history',
  'community.desc.region': 'Regional updates · {name} · 3d history',
  'community.desc.global': 'City-wide Nouakchott updates · 3d history',
  'theme.light': 'Switch to light theme',
  'theme.dark': 'Switch to dark theme',
  'unit.hoursShort': '{count}h',
  'unit.m': '{count}m',
  'unit.km': '{count}km',
}
