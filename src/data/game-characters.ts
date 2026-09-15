export type CharacterRole =
  | "fighter"
  | "assassin"
  | "mage"
  | "marksman"
  | "tank"
  | "support"
  | "hybrid";

export type GameCharacter = {
  slug: string;
  name: string;
  game: "tekken-8" | "street-fighter-6" | "mobile-legends-bang-bang" | "honor-of-kings";
  role?: CharacterRole[];
  lanes?: string[];
  dlc?: boolean;
};

const names = (game: GameCharacter["game"], values: string[], dlcNames = new Set<string>()) =>
  values.map((name) => ({
    slug: `${game}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
    name,
    game,
    dlc: dlcNames.has(name),
  }));

export const GAME_CHARACTERS: GameCharacter[] = [
  ...names("tekken-8", [
    "Alisa Bosconovitch", "Anna Williams", "Armor King", "Asuka Kazama", "Azucena", "Bob", "Bryan Fury",
    "Claudio Serafino", "Clive Rosfield", "Devil Jin", "Eddy Gordo", "Fahkumram", "Feng Wei", "Heihachi Mishima",
    "Hwoarang", "Jack-8", "Jin Kazama", "Jun Kazama", "Kazuya Mishima", "King", "Kuma", "Kunimitsu", "Lars Alexandersson",
    "Lee Chaolan", "Leo Kliesen", "Leroy Smith", "Lidia Sobieska", "Ling Xiaoyu", "Marshall Law", "Miary Zo", "Nina Williams",
    "Panda", "Paul Phoenix", "Raven", "Reina", "Sergei Dragunov", "Shaheen", "Steve Fox", "Victor Chevalier", "Yoshimitsu", "Zafina",
  ], new Set(["Anna Williams", "Eddy Gordo", "Lidia Sobieska", "Heihachi Mishima", "Clive Rosfield", "Fahkumram", "Armor King", "Miary Zo", "Kunimitsu", "Bob"])),

  ...names("street-fighter-6", [
    "Akuma", "A.K.I.", "Alex", "Blanka", "Cammy", "C. Viper", "Chun-Li", "Dee Jay", "Dhalsim", "Ed", "E. Honda",
    "Elena", "Guile", "Ingrid", "Jamie", "JP", "Juri", "Ken", "Kimberly", "Lily", "Luke", "M. Bison", "Manon", "Marisa",
    "Mai Shiranui", "Rashid", "Ryu", "Sagat", "Terry Bogard", "Zangief",
  ], new Set(["Akuma", "A.K.I.", "Alex", "C. Viper", "Ed", "Elena", "Ingrid", "M. Bison", "Mai Shiranui", "Rashid", "Sagat", "Terry Bogard"])),

  ...names("mobile-legends-bang-bang", [
    "Aamon", "Akai", "Aldous", "Alice", "Alpha", "Alucard", "Angela", "Argus", "Arlott", "Atlas", "Aulus", "Aurora",
    "Badang", "Balmond", "Bane", "Barats", "Baxia", "Beatrix", "Belerick", "Benedetta", "Brody", "Bruno", "Carmilla", "Cecilion",
    "Chang'e", "Chip", "Chou", "Cici", "Claude", "Clint", "Cyclops", "Diggie", "Dyrroth", "Edith", "Esmeralda", "Estes", "Eudora",
    "Fanny", "Faramis", "Floryn", "Franco", "Fredrinn", "Freya", "Gatotkaca", "Gloo", "Gord", "Granger", "Grock", "Guinevere", "Gusion",
    "Hanabi", "Hanzo", "Harith", "Harley", "Hayabusa", "Helcurt", "Hilda", "Hylos", "Irithel", "Ixia", "Jawhead", "Johnson", "Joy", "Julian",
    "Kadita", "Kagura", "Kaja", "Kalea", "Karina", "Karrie", "Khaleed", "Khufra", "Kimmy", "Lancelot", "Lapu-Lapu", "Layla", "Leomord",
    "Lesley", "Ling", "Lolita", "Lukas", "Lunox", "Luo Yi", "Lylia", "Marcel", "Martis", "Masha", "Mathilda", "Melissa", "Minotaur",
    "Minsitthar", "Miya", "Moskov", "Nana", "Natalia", "Natan", "Nolan", "Novaria", "Obsidia", "Odette", "Paquito", "Pharsa", "Phoveus",
    "Popol and Kupa", "Rafaela", "Roger", "Ruby", "Saber", "Selena", "Silvanna", "Sora", "Sun", "Suyou", "Terizla", "Thamuz", "Tigreal",
    "Uranus", "Vale", "Valentina", "Valir", "Vexana", "Wanwan", "X.Borg", "Xavier", "Yi Sun-shin", "Yin", "Yu Zhong", "Yve", "Zetian",
    "Zhask", "Zhuxin", "Zilong", "Hirara",
  ]),

  ...names("honor-of-kings", [
    "Agudo", "Alessio", "Allain", "Angela", "Annette", "Ao'yin", "Arke", "Arli", "Arthur", "Ata", "Athena", "Augran", "Bai Qi",
    "Biron", "Butterfly", "Cai Yan", "Chano", "Charlotte", "Chicha", "Cirrus", "Consort Yu", "Da Qiao", "Daji", "Dharma", "Di Renjie",
    "Dian Wei", "Diaochan", "Dolia", "Donghuang", "Dr Bian", "Dun", "Dyadia", "Erin", "Fang", "Fatih", "Feyd", "Florentino", "Flowborn (Mage)",
    "Flowborn (Marksman)", "Flowborn (Tank)", "Fuzi", "Gan & Mo", "Gao", "Gao Changgong", "Garo", "Garuda", "Guan Yu", "Guiguzi", "Han Xin",
    "Haya", "Heino", "Hou Yi", "Huang Zhong", "Jing", "Kaizer", "Kongming", "Kui", "Lady Sun", "Lady Zhen", "Lam", "Lapulapu", "Li Bai",
    "Li Xin", "Lian Po", "Liang", "Liu Bang", "Liu Bei", "Liu Shan", "Lorion", "Lu Bu", "Luara", "Luban No.7", "Luna", "Mai Shiranui", "Marco Polo",
    "Mayene", "Meng Ya", "Menki", "Mi Yue", "Milady", "Ming", "Mozi", "Mulan", "Musashi", "Nakoruru", "Nezha", "Nuwa", "Pei", "Sakeer",
    "Shangguan", "Shi", "Shouyue", "Sima Yi", "Sun Bin", "Sun Ce", "Ukyo Tachibana", "Umbrosa", "Wang Zhaojun", "Wukong", "Wuyan", "Xiang Yu",
    "Xiao Qiao", "Xuance", "Yang Jian", "Yango", "Yao", "Yaria", "Ying", "Yixing", "Yuhuan", "Zhang Fei", "Zhou Yu", "Zhuangzi", "Zilong", "Ziya",
  ]),
];

export const GAME_CHARACTER_COUNTS = Object.fromEntries(
  ["tekken-8", "street-fighter-6", "mobile-legends-bang-bang", "honor-of-kings"].map((game) => [
    game,
    GAME_CHARACTERS.filter((character) => character.game === game).length,
  ]),
);

export const getGameCharacters = (game: GameCharacter["game"]) =>
  GAME_CHARACTERS.filter((character) => character.game === game);

export const findGameCharacter = (game: GameCharacter["game"], query: string) => {
  const normalized = query.trim().toLowerCase();
  return getGameCharacters(game).filter((character) => character.name.toLowerCase().includes(normalized));
};
