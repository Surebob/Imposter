// ASCII Templates for Who Is It? game
// Each template is carefully formatted for terminal display

export const HEADERS = {
  MAIN: [
    "╔════════════════════════════════════╗",
    "║            WHO IS IT?              ║",
    "║  IMPOSTOR DETECTION PROTOCOL v2.1  ║", 
    "╚════════════════════════════════════╝"
  ],

  ACTIVE_SESSION: [
    "╔═════════════════════════════════════════════════════════════════════════════╗",
    "║                         WHO IS IT? - ACTIVE SESSION                         ║",
    "╚═════════════════════════════════════════════════════════════════════════════╝"
  ],

  HOST_PROTOCOL: [
    "╔═════════════════════════════════════════════════════════════════════════════╗",
    "║                           HOST PROTOCOL INIT                               ║",
    "╚═════════════════════════════════════════════════════════════════════════════╝"
  ],

  OPERATIVE_PROTOCOL: [
    "╔═════════════════════════════════════════════════════════════════════════════╗",
    "║                          OPERATIVE PROTOCOL                                ║", 
    "╚═════════════════════════════════════════════════════════════════════════════╝"
  ],

  MISSION_BRIEFING: [
    "╔═════════════════════════════════════════════════════════════════════════════╗",
    "║                           MISSION BRIEFING                                 ║",
    "╚═════════════════════════════════════════════════════════════════════════════╝"
  ],

  INTELLIGENCE_ANALYSIS: [
    "╔═════════════════════════════════════════════════════════════════════════════╗",
    "║                        INTELLIGENCE ANALYSIS                               ║",
    "╚═════════════════════════════════════════════════════════════════════════════╝"
  ],

  ELIMINATION_PROTOCOL: [
    "╔═════════════════════════════════════════════════════════════════════════════╗",
    "║                         ELIMINATION PROTOCOL                               ║",
    "╚═════════════════════════════════════════════════════════════════════════════╝"
  ],

  MISSION_COMPLETE: [
    "╔═════════════════════════════════════════════════════════════════════════════╗",
    "║                       MISSION ANALYSIS COMPLETE                            ║",
    "╚═════════════════════════════════════════════════════════════════════════════╝"
  ]
};

export const MENUS = {
  MAIN_MENU: [
    "┌─────────────────────────────────────────────────────────────────────────────┐",
    "│ [1] HOST NEW DETECTION SESSION                                              │",
    "│ [2] JOIN EXISTING SESSION                                                   │", 
    "│ [3] ABORT MISSION                                                           │",
    "└─────────────────────────────────────────────────────────────────────────────┘"
  ]
};

export const TABLES = {
  PLAYER_ROSTER_HEADER: [
    "┌─────────────────────────────────────────┬─────────────┬─────────────────┐",
    "│ DESIGNATION                             │ ROLE        │ STATUS          │",
    "├─────────────────────────────────────────┼─────────────┼─────────────────┤"
  ],
  
  PLAYER_ROSTER_FOOTER: [
    "└─────────────────────────────────────────┴─────────────┴─────────────────┘"
  ],

  INTEL_BOX: [
    "┌─────────────────────────────────────────────────────────────────────────────┐",
    "│ CATEGORY: {category}                                                        │",
    "│ TEAM CODENAME: {shared}                                                     │",
    "│ IMPOSTOR CODENAME: {impostor}                                               │",
    "└─────────────────────────────────────────────────────────────────────────────┘"
  ]
};

export const ALERTS = {
  IMPOSTOR_WARNING: [
    "⚠️ ⚠️ ⚠️ ⚠️ ⚠️  CLASSIFIED ALERT  ⚠️ ⚠️ ⚠️ ⚠️ ⚠️",
    "█                                                     █",
    "█               YOU ARE THE IMPOSTOR                  █",
    "█                                                     █",
    "█          MISSION: BLEND IN WITHOUT DETECTION       █",
    "█          DO NOT REVEAL YOUR TRUE CODENAME           █",
    "█                                                     █",
    "⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️"
  ]
};

// Helper function to format player row for table
export function formatPlayerRow(player, currentPlayerId) {
  const name = player.name.padEnd(28);
  const role = (player.isHost ? "HOST" : "AGENT").padEnd(11);
  const you = player.id === currentPlayerId ? " ◄ YOU" : "           ";
  return `│ ${name} │ ${role} │${you} │`;
}

// Helper function to replace placeholders in intel box
export function formatIntelBox(wordPair) {
  return TABLES.INTEL_BOX.map(line => 
    line.replace('{category}', wordPair.category.padEnd(64))
        .replace('{shared}', wordPair.shared.padEnd(61))
        .replace('{impostor}', wordPair.impostor.padEnd(59))
  );
}
