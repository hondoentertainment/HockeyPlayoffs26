export const TEAMS: string[] = [
  // Atlantic
  "Boston Bruins",
  "Buffalo Sabres",
  "Detroit Red Wings",
  "Florida Panthers",
  "Montreal Canadiens",
  "Ottawa Senators",
  "Tampa Bay Lightning",
  "Toronto Maple Leafs",
  // Metropolitan
  "Carolina Hurricanes",
  "Columbus Blue Jackets",
  "New Jersey Devils",
  "New York Islanders",
  "New York Rangers",
  "Philadelphia Flyers",
  "Pittsburgh Penguins",
  "Washington Capitals",
  // Central
  "Chicago Blackhawks",
  "Colorado Avalanche",
  "Dallas Stars",
  "Minnesota Wild",
  "Nashville Predators",
  "St. Louis Blues",
  "Utah Mammoth",
  "Winnipeg Jets",
  // Pacific
  "Anaheim Ducks",
  "Calgary Flames",
  "Edmonton Oilers",
  "Los Angeles Kings",
  "San Jose Sharks",
  "Seattle Kraken",
  "Vancouver Canucks",
  "Vegas Golden Knights"
];

export const norm = (s: string | null | undefined) =>
  (s ?? "").trim().toUpperCase();
