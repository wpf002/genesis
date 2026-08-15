// 180 counterfactuals, each with a dated point of divergence, the countries most
// involved, and a structural reading the engine can actually run.
//
// The premise text is the scenario as asked for. The lever is how it becomes
// something the kernel can execute. Those are different things and the interface
// keeps them apart on purpose: the engine simulates the lever, not the premise.

import {
  agricultureFails,
  conquest,
  conquestFails,
  culturalTurn,
  empireBreaks,
  empireEndures,
  industrialise,
  internalStrife,
  plagueAverted,
  plagueWorse,
  populationCollapse,
  populationSpared,
  publicWorks,
  technologyEarly,
  technologyLost,
  tradeCloses,
  tradeOpens,
  unmapped,
  type Lever,
} from './levers.js';

export type Era =
  | 'Ancient World'
  | 'Medieval World'
  | 'Exploration & Early Modern'
  | 'Revolution & Early United States'
  | 'Civil War & Reconstruction'
  | 'Industrial & Imperial Age'
  | 'World War I'
  | 'World War II'
  | 'Cold War'
  | 'Modern History'
  | 'Technology & Science'
  | 'Civilization-Level'
  | 'Deep Dive';

export interface CatalogueEntry {
  readonly n: number;
  readonly id: string;
  readonly era: Era;
  readonly title: string;
  readonly premise: string;
  /** Point of divergence. Negative is BC. */
  readonly year: number;
  /** ADM0_A3 codes for the countries the divergence lands on. */
  readonly regions: readonly string[];
  readonly lever: Lever;
}

const E = (
  n: number,
  era: Era,
  title: string,
  premise: string,
  year: number,
  regions: readonly string[],
  lever: Lever,
): CatalogueEntry => ({
  n,
  id: title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60),
  era,
  title,
  premise,
  year,
  regions,
  lever,
});

// Region shorthands. Modern codes standing in for historical polities, which is
// the closest the map can get.
const ROME = ['ITA', 'GRC', 'TUR', 'EGY', 'ESP', 'FRA', 'TUN'];
const MED = ['ITA', 'GRC', 'TUR', 'EGY', 'TUN', 'ESP'];
const EUROPE = ['FRA', 'DEU', 'GBR', 'ITA', 'ESP', 'POL', 'AUT', 'NLD', 'BEL', 'CZE', 'HUN'];
const WEUROPE = ['FRA', 'DEU', 'GBR', 'ITA', 'ESP', 'NLD', 'BEL'];
const LEVANT = ['ISR', 'SYR', 'LBN', 'JOR', 'EGY', 'TUR', 'IRQ'];
const PERSIA = ['IRN', 'IRQ', 'AFG', 'TKM', 'UZB'];
const STEPPE = ['MNG', 'CHN', 'KAZ', 'RUS', 'UZB'];
const NAMERICA = ['USA', 'CAN', 'MEX'];
const ANDES = ['PER', 'BOL', 'ECU', 'CHL'];
const AXIS = ['DEU', 'ITA', 'JPN', 'AUT', 'HUN'];
const ALLIES = ['USA', 'GBR', 'RUS', 'FRA', 'CAN', 'AUS'];
const PACIFIC = ['JPN', 'USA', 'PHL', 'AUS', 'CHN', 'IDN'];
const SUPERPOWERS = ['USA', 'RUS'];
const WORLD_MAJOR = ['USA', 'RUS', 'CHN', 'DEU', 'GBR', 'FRA', 'IND', 'JPN', 'BRA'];

export const CATALOGUE: readonly CatalogueEntry[] = [
  // --- Ancient World -----------------------------------------------------
  E(1, 'Ancient World', 'Alexander the Great Lives Another 30 Years', 'Alexander survives Babylon, stabilizes succession, and launches campaigns into Arabia and possibly the western Mediterranean.', -323, ['GRC', 'TUR', 'EGY', 'IRN', 'IRQ', 'SAU', 'IND'], conquest()),
  E(2, 'Ancient World', 'Alexander Loses at Gaugamela', 'Persia survives and Macedonian expansion collapses.', -331, ['GRC', ...PERSIA], conquestFails()),
  E(3, 'Ancient World', 'Carthage Wins the Second Punic War', 'Hannibal defeats Rome decisively and Carthage becomes the dominant western Mediterranean power.', -216, ['TUN', 'ITA', 'ESP', 'DZA'], conquest()),
  E(4, 'Ancient World', 'Hannibal Captures Rome', 'Rome falls during Hannibal’s Italian campaign rather than recovering.', -211, ['ITA', 'TUN', 'ESP'], empireBreaks()),
  E(5, 'Ancient World', 'Julius Caesar Survives the Ides of March', 'Caesar consolidates permanent control and reshapes Rome himself.', -44, ROME, empireEndures()),
  E(6, 'Ancient World', 'The Roman Republic Survives', 'Caesar, Pompey, and the civil wars never produce an imperial system.', -49, ROME, internalStrife()),
  E(7, 'Ancient World', 'Augustus Dies Young', 'Rome enters another succession crisis before the Principate becomes institutionalized.', -23, ROME, internalStrife()),
  E(8, 'Ancient World', 'Cleopatra and Antony Defeat Octavian', 'Alexandria becomes the political center of a new Roman-Hellenistic order.', -31, ['EGY', 'ITA', 'GRC', 'TUR'], conquest()),
  E(9, 'Ancient World', 'Rome Conquers Germania', 'The Rhine never becomes Rome’s northeastern frontier.', 9, ['DEU', 'ITA', 'FRA', 'AUT', 'CZE', 'POL'], conquest()),
  E(10, 'Ancient World', 'Rome Conquers Parthia', 'Roman power extends deeply into Mesopotamia and Persia.', 117, ['ITA', 'IRQ', 'IRN', 'SYR', 'TUR'], conquest()),
  E(11, 'Ancient World', 'The Western Roman Empire Never Falls', 'Rome successfully reforms its military, taxation, and succession systems.', 400, ROME, empireEndures()),
  E(12, 'Ancient World', 'Constantine Loses at the Milvian Bridge', 'Christianity’s relationship with imperial Rome develops completely differently.', 312, ROME, culturalTurn()),
  E(13, 'Ancient World', 'Julian the Apostate Restores Paganism', 'Christianity loses imperial dominance during the fourth century.', 361, ROME, culturalTurn()),
  E(14, 'Ancient World', 'The Library of Alexandria Survives Intact', 'Large bodies of ancient scholarship remain continuously available.', -48, ['EGY', 'GRC', 'ITA', 'TUR'], technologyEarly()),
  E(15, 'Ancient World', 'Spartacus Defeats Rome', 'The slave rebellion survives and establishes an independent territory.', -71, ['ITA', 'GRC'], internalStrife()),

  // --- Medieval World ----------------------------------------------------
  E(16, 'Medieval World', 'Byzantium Reconquers the Western Empire', 'Justinian’s reconquests become permanent.', 554, MED, conquest()),
  E(17, 'Medieval World', 'Byzantium Defeats the Seljuks at Manzikert', 'Anatolia remains predominantly Byzantine.', 1071, ['TUR', 'GRC', 'IRN'], conquestFails()),
  E(18, 'Medieval World', 'Constantinople Never Falls', 'Byzantium survives beyond 1453.', 1453, ['TUR', 'GRC', 'BGR', 'SRB'], empireEndures()),
  E(19, 'Medieval World', 'The First Crusade Fails', 'Jerusalem never becomes the center of a Crusader kingdom.', 1099, LEVANT, conquestFails()),
  E(20, 'Medieval World', 'The Crusader States Survive', 'Permanent Latin Christian states emerge in the Levant.', 1187, LEVANT, publicWorks()),
  E(21, 'Medieval World', 'Saladin Loses Jerusalem', 'A Crusader power retakes the city permanently.', 1187, LEVANT, conquest()),
  E(22, 'Medieval World', 'The Mongols Conquer Western Europe', 'The Mongol advance continues beyond Hungary and Poland.', 1242, ['MNG', 'HUN', 'POL', 'DEU', 'AUT', 'ITA', 'FRA', 'CZE'], conquest()),
  E(23, 'Medieval World', 'The Mongols Conquer Japan', 'The kamikaze storms fail to destroy the invasion fleets.', 1281, ['JPN', 'MNG', 'CHN', 'KOR'], conquest()),
  E(24, 'Medieval World', 'Genghis Khan Lives Another 20 Years', 'Mongol expansion accelerates under its original founder.', 1227, STEPPE, conquest()),
  E(25, 'Medieval World', 'The Black Death Never Occurs', 'Europe’s demographic, economic, religious, and political development changes radically.', 1347, [...EUROPE, 'TUR', 'EGY', 'RUS'], plagueAverted()),
  E(26, 'Medieval World', 'The Black Death Is Even Deadlier', 'European civilization survives a 70–80% population collapse.', 1347, [...EUROPE, 'TUR', 'EGY', 'RUS'], plagueWorse()),
  E(27, 'Medieval World', 'The Vikings Settle North America Permanently', 'Vinland becomes a lasting Norse colony.', 1000, ['NOR', 'ISL', 'CAN', 'GRL', 'DNK'], tradeOpens()),
  E(28, 'Medieval World', 'England Wins the Hundred Years’ War', 'England and France potentially develop under a common crown.', 1429, ['GBR', 'FRA'], conquest()),
  E(29, 'Medieval World', 'The Norman Conquest Fails', 'Anglo-Saxon England survives Hastings.', 1066, ['GBR', 'FRA', 'NOR'], conquestFails()),
  E(30, 'Medieval World', 'The Magna Carta Never Exists', 'English constitutional development follows another path.', 1215, ['GBR'], internalStrife()),

  // --- Exploration & Early Modern ---------------------------------------
  E(31, 'Exploration & Early Modern', 'Columbus Never Reaches the Americas', 'Sustained European-American contact occurs centuries later.', 1492, ['ESP', 'PRT', 'MEX', 'PER', 'USA', 'BRA'], tradeCloses()),
  E(32, 'Exploration & Early Modern', 'China Discovers America First', 'Ming expeditions establish sustained Pacific contact with the Americas.', 1421, ['CHN', 'MEX', 'PER', 'USA', 'PHL', 'IDN'], tradeOpens()),
  E(33, 'Exploration & Early Modern', 'The Aztec Empire Defeats Cortés', 'Spain fails to conquer central Mexico.', 1521, ['MEX', 'ESP', 'GTM'], conquestFails()),
  E(34, 'Exploration & Early Modern', 'The Inca Defeat Pizarro', 'Tawantinsuyu survives European contact.', 1532, [...ANDES, 'ESP'], conquestFails()),
  E(35, 'Exploration & Early Modern', 'The Americas Are Not Devastated by Disease', 'European colonization meets tens of millions of surviving indigenous people.', 1520, ['MEX', 'PER', 'USA', 'BRA', 'BOL', 'ECU', 'GTM', 'COL', 'CAN'], populationSpared()),
  E(36, 'Exploration & Early Modern', 'Spain Colonizes Most of North America', 'Spanish dominance extends across much of the future United States.', 1600, ['ESP', 'USA', 'MEX', 'CAN'], conquest()),
  E(37, 'Exploration & Early Modern', 'France Wins the Seven Years’ War', 'New France remains the dominant European power in North America.', 1763, ['FRA', 'CAN', 'USA', 'GBR'], conquest()),
  E(38, 'Exploration & Early Modern', 'The Spanish Armada Defeats England', 'Elizabethan England faces invasion and Catholic restoration.', 1588, ['ESP', 'GBR', 'NLD'], conquest()),
  E(39, 'Exploration & Early Modern', 'The Protestant Reformation Fails', 'Western Christianity remains predominantly under Rome.', 1521, EUROPE, culturalTurn()),
  E(40, 'Exploration & Early Modern', 'Martin Luther Is Executed Early', 'Protestantism develops without Luther as its central catalyst.', 1521, ['DEU', 'CZE', 'AUT', 'CHE'], culturalTurn()),
  E(41, 'Exploration & Early Modern', 'The Ottomans Capture Vienna', 'Ottoman power expands deeply into Central Europe.', 1683, ['TUR', 'AUT', 'HUN', 'DEU', 'POL', 'ITA'], conquest()),
  E(42, 'Exploration & Early Modern', 'The Ottoman Empire Industrializes Early', 'A modernized Ottoman state remains a great power into the twentieth century.', 1800, ['TUR', 'EGY', 'SYR', 'IRQ', 'GRC', 'BGR'], industrialise()),
  E(43, 'Exploration & Early Modern', 'Japan Never Closes Itself Off', 'Japanese industrialization begins centuries earlier.', 1639, ['JPN', 'CHN', 'KOR', 'PHL'], tradeOpens()),
  E(44, 'Exploration & Early Modern', 'Gunpowder Is Never Invented', 'Warfare stays dominated by fortifications, cavalry, bows and edged weapons.', 1200, [...EUROPE, 'CHN', 'TUR', 'IND'], technologyLost()),

  // --- Revolution & Early United States ---------------------------------
  E(45, 'Revolution & Early United States', 'Britain Wins the American Revolution', 'The Thirteen Colonies remain within the British Empire.', 1781, ['USA', 'GBR', 'CAN'], conquest()),
  E(46, 'Revolution & Early United States', 'Washington Is Killed During the Revolution', 'Independence proceeds without its central military leader.', 1776, ['USA', 'GBR'], conquestFails()),
  E(47, 'Revolution & Early United States', 'France Never Supports the Revolution', 'The rebellion faces Britain without decisive French assistance.', 1778, ['USA', 'FRA', 'GBR'], conquestFails()),
  E(48, 'Revolution & Early United States', 'The Articles of Confederation Survive', 'The United States remains a weak federation of sovereign states.', 1787, ['USA'], internalStrife()),
  E(49, 'Revolution & Early United States', 'The Constitutional Convention Fails', 'No Constitution of 1787.', 1787, ['USA'], empireBreaks()),
  E(50, 'Revolution & Early United States', 'Washington Accepts a Third Term', 'The two-term presidential tradition never develops.', 1796, ['USA'], empireEndures()),
  E(51, 'Revolution & Early United States', 'Alexander Hamilton Becomes President', 'Hamiltonian economic nationalism gains direct executive power.', 1800, ['USA'], industrialise()),
  E(52, 'Revolution & Early United States', 'Hamilton Kills Burr in Their Duel', 'Hamilton survives while Burr dies.', 1804, ['USA'], industrialise()),
  E(53, 'Revolution & Early United States', 'The Louisiana Purchase Never Happens', 'France retains or loses Louisiana to another power.', 1803, ['USA', 'FRA', 'ESP'], tradeCloses()),
  E(54, 'Revolution & Early United States', 'Napoleon Builds a French North America', 'France concentrates on Louisiana rather than abandoning it.', 1803, ['FRA', 'USA', 'CAN', 'MEX'], conquest()),
  E(55, 'Revolution & Early United States', 'The War of 1812 Ends in American Defeat', 'Britain imposes major concessions on the United States.', 1814, ['USA', 'GBR', 'CAN'], conquestFails()),
  E(56, 'Revolution & Early United States', 'The United States Annexes Canada', 'North America’s political geography is radically different.', 1814, [...NAMERICA, 'GBR'], conquest()),
  E(57, 'Revolution & Early United States', 'Texas Remains an Independent Republic', 'Texas never joins the United States.', 1845, ['USA', 'MEX'], empireBreaks()),
  E(58, 'Revolution & Early United States', 'Mexico Wins the Mexican-American War', 'California and the Southwest remain Mexican.', 1848, ['MEX', 'USA'], conquest()),
  E(59, 'Revolution & Early United States', 'California Becomes an Independent Country', 'The Pacific coast develops outside Washington’s control.', 1850, ['USA', 'MEX'], empireBreaks()),

  // --- Civil War & Reconstruction ---------------------------------------
  E(60, 'Civil War & Reconstruction', 'The Civil War Never Happens', 'Slavery survives longer and ends through another mechanism.', 1861, ['USA'], empireEndures()),
  E(61, 'Civil War & Reconstruction', 'The Confederacy Wins the Civil War', 'North America permanently fractures.', 1863, ['USA', 'MEX', 'CAN'], empireBreaks()),
  E(62, 'Civil War & Reconstruction', 'Lee Wins at Gettysburg', 'Confederate forces threaten Washington and Northern support deteriorates.', 1863, ['USA'], conquest()),
  E(63, 'Civil War & Reconstruction', 'Lincoln Loses the 1864 Election', 'Negotiations potentially end the war before Confederate defeat.', 1864, ['USA'], empireBreaks()),
  E(64, 'Civil War & Reconstruction', 'Lincoln Survives the Assassination', 'Presidential Reconstruction proceeds under Lincoln.', 1865, ['USA'], empireEndures()),
  E(65, 'Civil War & Reconstruction', 'Reconstruction Succeeds', 'Federal enforcement permanently protects Black political participation.', 1877, ['USA'], empireEndures()),
  E(66, 'Civil War & Reconstruction', 'Reconstruction Never Happens', 'Former Confederate governments regain control almost immediately.', 1865, ['USA'], internalStrife()),
  E(67, 'Civil War & Reconstruction', 'John Brown Sparks a Successful Insurrection', 'The war begins through widespread rebellion rather than secession.', 1859, ['USA'], internalStrife()),

  // --- Industrial & Imperial Age ----------------------------------------
  E(68, 'Industrial & Imperial Age', 'Tesla’s Electrical Vision Dominates', 'Tesla-backed technologies receive sustained industrial financing.', 1893, ['USA', 'DEU', 'GBR'], technologyEarly()),
  E(69, 'Industrial & Imperial Age', 'The Internal Combustion Engine Never Dominates', 'Steam, electric or another propulsion technology becomes standard.', 1900, WORLD_MAJOR, technologyLost()),
  E(70, 'Industrial & Imperial Age', 'Aviation Is Delayed by Decades', 'The Wright brothers fail and flight arrives much later.', 1903, WORLD_MAJOR, technologyLost()),
  E(71, 'Industrial & Imperial Age', 'The Titanic Never Sinks', 'Maritime regulation and several prominent lives follow different paths.', 1912, ['GBR', 'USA'], tradeOpens()),
  E(72, 'Industrial & Imperial Age', 'Imperial Russia Successfully Reforms', 'The Romanovs transition toward constitutional monarchy.', 1905, ['RUS', 'UKR', 'POL', 'FIN'], empireEndures()),
  E(73, 'Industrial & Imperial Age', 'The Russian Revolution Fails', 'No Soviet Union emerges under Bolshevik control.', 1917, ['RUS', 'UKR', 'BLR', 'KAZ'], empireEndures()),
  E(74, 'Industrial & Imperial Age', 'The Qing Dynasty Successfully Modernizes', 'China industrializes without republican revolution.', 1898, ['CHN', 'MNG', 'KOR'], industrialise()),
  E(75, 'Industrial & Imperial Age', 'Japan Never Undergoes the Meiji Restoration', 'Japan stays decentralized and technologically behind.', 1868, ['JPN'], technologyLost()),

  // --- World War I -------------------------------------------------------
  E(76, 'World War I', 'Franz Ferdinand Is Never Assassinated', 'The July Crisis never occurs in its historical form.', 1914, EUROPE, empireEndures()),
  E(77, 'World War I', 'World War I Never Happens', 'European empires survive deeper into the twentieth century.', 1914, [...EUROPE, 'RUS', 'TUR'], empireEndures()),
  E(78, 'World War I', 'Germany Wins World War I', 'Germany dominates continental Europe.', 1918, [...EUROPE, 'RUS'], conquest()),
  E(79, 'World War I', 'America Never Enters World War I', 'The exhausted European powers negotiate a different settlement.', 1917, [...EUROPE, 'USA'], conquestFails()),
  E(80, 'World War I', 'Russia Wins the Eastern Front', 'Imperial Russia survives while Germany and Austria-Hungary collapse.', 1917, ['RUS', 'DEU', 'AUT', 'HUN', 'POL'], conquest()),
  E(81, 'World War I', 'The Ottoman Empire Survives World War I', 'The modern Middle East develops without the same partition.', 1918, ['TUR', 'SYR', 'IRQ', 'ISR', 'JOR', 'SAU', 'LBN'], empireEndures()),
  E(82, 'World War I', 'The Armenian Genocide Never Occurs', 'Armenian communities remain major populations across Anatolia.', 1915, ['TUR', 'ARM', 'SYR'], populationSpared()),
  E(83, 'World War I', 'Versailles Is Far More Lenient', 'German revanchism develops differently.', 1919, [...EUROPE], empireEndures()),
  E(84, 'World War I', 'Versailles Dismantles Germany Completely', 'Central Europe fractures into numerous states.', 1919, ['DEU', 'POL', 'CZE', 'AUT', 'FRA'], empireBreaks()),

  // --- World War II ------------------------------------------------------
  E(85, 'World War II', 'Hitler Never Rises to Power', 'Germany follows an authoritarian, communist, democratic or monarchical alternative.', 1933, [...EUROPE, 'RUS'], empireEndures()),
  E(86, 'World War II', 'Hitler Is Killed in World War I', 'National Socialism develops without its central figure.', 1916, [...EUROPE, 'RUS'], empireEndures()),
  E(87, 'World War II', 'Germany Never Invades the Soviet Union', 'Hitler concentrates against Britain and the Mediterranean.', 1941, ['DEU', 'RUS', 'GBR', 'ITA', 'EGY'], conquest()),
  E(88, 'World War II', 'Germany Defeats the Soviet Union', 'Moscow falls and Soviet resistance collapses.', 1942, ['DEU', 'RUS', 'UKR', 'POL', 'BLR'], conquest()),
  E(89, 'World War II', 'Operation Sea Lion Succeeds', 'Britain faces German invasion and occupation.', 1940, ['GBR', 'DEU', 'FRA', 'IRL'], conquest()),
  E(90, 'World War II', 'Britain Negotiates Peace in 1940', 'Churchill loses the argument to continue the war.', 1940, ['GBR', 'DEU', 'FRA'], empireBreaks()),
  E(91, 'World War II', 'Germany Wins World War II in Europe', 'Europe becomes dominated by the Third Reich.', 1944, [...AXIS, ...EUROPE, 'RUS'], conquest()),
  E(92, 'World War II', 'Japan Never Attacks Pearl Harbor', 'The United States enters the war differently or much later.', 1941, PACIFIC, tradeOpens()),
  E(93, 'World War II', 'Pearl Harbor Destroys the American Carriers', 'The Pacific balance shifts dramatically toward Japan.', 1941, PACIFIC, conquest()),
  E(94, 'World War II', 'Japan Wins at Midway', 'American carrier power suffers catastrophic defeat.', 1942, PACIFIC, conquest()),
  E(95, 'World War II', 'Japan Invades Australia', 'The Pacific War expands onto the Australian continent.', 1942, ['JPN', 'AUS', 'PNG', 'IDN', 'USA'], conquest()),
  E(96, 'World War II', 'D-Day Fails', 'The Western Allies lose their Normandy beachhead.', 1944, ['FRA', 'DEU', 'GBR', 'USA'], conquestFails()),
  E(97, 'World War II', 'The July 20 Plot Kills Hitler', 'German officers overthrow the Nazi leadership in 1944.', 1944, [...EUROPE, 'RUS'], empireBreaks()),
  E(98, 'World War II', 'The United States Never Develops the Bomb', 'Operation Downfall becomes a serious possibility.', 1945, ['USA', 'JPN'], technologyLost()),
  E(99, 'World War II', 'Germany Develops Nuclear Weapons First', 'Nazi Germany acquires an atomic capability before defeat.', 1944, ['DEU', 'GBR', 'USA', 'RUS'], technologyEarly()),
  E(100, 'World War II', 'Japan Refuses to Surrender', 'Allied invasion plans proceed after Hiroshima and Nagasaki.', 1945, ['JPN', 'USA'], populationCollapse()),
  E(101, 'World War II', 'The Soviet Union Occupies All of Germany', 'The Iron Curtain forms substantially farther west.', 1945, ['RUS', 'DEU', 'POL', 'AUT', 'CZE'], conquest()),
  E(102, 'World War II', 'Patton Reaches Berlin First', 'Occupation boundaries become a major Allied-Soviet confrontation.', 1945, ['USA', 'RUS', 'DEU'], conquest()),

  // --- Cold War ----------------------------------------------------------
  E(103, 'Cold War', 'The Berlin Blockade Triggers World War III', 'The United States and Soviet Union go to war in 1948.', 1948, [...ALLIES, 'DEU', 'POL'], populationCollapse()),
  E(104, 'Cold War', 'The Korean War Becomes Nuclear', 'Truman authorizes nuclear weapons against Chinese or North Korean forces.', 1951, ['KOR', 'PRK', 'CHN', 'USA', 'RUS'], populationCollapse()),
  E(105, 'Cold War', 'North Korea Wins the Korean War', 'The entire peninsula becomes communist.', 1950, ['PRK', 'KOR', 'CHN', 'USA'], conquest()),
  E(106, 'Cold War', 'South Korea Wins the Korean War', 'Korea reunifies under Seoul.', 1950, ['KOR', 'PRK', 'CHN', 'USA'], conquest()),
  E(107, 'Cold War', 'The Cuban Missile Crisis Goes Nuclear', 'October 1962 becomes the beginning of World War III.', 1962, [...SUPERPOWERS, 'CUB', 'GBR', 'FRA', 'DEU'], populationCollapse()),
  E(108, 'Cold War', 'Kennedy Survives Dallas', 'JFK completes his presidency on a very different Vietnam trajectory.', 1963, ['USA', 'VNM'], empireEndures()),
  E(109, 'Cold War', 'Oswald Is Captured Alive', 'Oswald goes to trial and conspiracy culture develops differently.', 1963, ['USA'], empireEndures()),
  E(110, 'Cold War', 'The United States Wins the Vietnam War', 'South Vietnam survives as an American-aligned state.', 1973, ['VNM', 'USA', 'KHM', 'LAO'], conquest()),
  E(111, 'Cold War', 'The United States Never Enters Vietnam', 'American politics and Cold War strategy change dramatically.', 1965, ['VNM', 'USA', 'KHM', 'LAO'], tradeOpens()),
  E(112, 'Cold War', 'China and the USSR Go to War', 'The Sino-Soviet split becomes a major interstate conflict.', 1969, ['CHN', 'RUS', 'MNG', 'KAZ'], conquest()),
  E(113, 'Cold War', 'The Soviet Union Lands on the Moon First', 'The geopolitical meaning of the Space Race reverses.', 1969, SUPERPOWERS, technologyEarly()),
  E(114, 'Cold War', 'Apollo 11 Fails', 'Armstrong and Aldrin are stranded on the Moon.', 1969, ['USA', 'RUS'], technologyLost()),
  E(115, 'Cold War', 'The Space Race Never Ends', 'Permanent lunar bases emerge during the 1970s or 1980s.', 1972, SUPERPOWERS, technologyEarly()),
  E(116, 'Cold War', 'Reagan Is Killed in 1981', 'George H. W. Bush assumes the presidency months into the first term.', 1981, ['USA', 'RUS'], internalStrife()),
  E(117, 'Cold War', 'The Soviet Union Never Collapses', 'A reformed USSR survives into the twenty-first century.', 1991, ['RUS', 'UKR', 'KAZ', 'BLR', 'UZB', 'GEO'], empireEndures()),
  E(118, 'Cold War', 'The 1991 Soviet Coup Succeeds', 'Hardliners overthrow Gorbachev and attempt to preserve the USSR.', 1991, ['RUS', 'UKR', 'KAZ', 'BLR'], internalStrife()),

  // --- Modern History ----------------------------------------------------
  E(119, 'Modern History', 'The Internet Stays Government and Academic', 'The commercial web never develops in its familiar form.', 1993, WORLD_MAJOR, technologyLost()),
  E(120, 'Modern History', 'Apple Fails in the 1990s', 'Personal computing and smartphones develop without Apple’s resurgence.', 1997, ['USA', 'JPN', 'CHN', 'KOR'], technologyLost()),
  E(121, 'Modern History', 'The Smartphone Is Never Invented', 'Mobile computing develops through specialized devices.', 2007, WORLD_MAJOR, technologyLost()),
  E(122, 'Modern History', 'Y2K Causes Widespread Failures', 'January 1, 2000 produces genuine systemic disruption.', 2000, WORLD_MAJOR, technologyLost()),
  E(123, 'Modern History', 'The September 11 Attacks Are Prevented', 'American foreign policy enters the century without 9/11.', 2001, ['USA', 'AFG', 'IRQ', 'SAU', 'PAK'], empireEndures()),
  E(124, 'Modern History', '9/11 Triggers a Much Larger War', 'The War on Terror expands into a broader interstate conflict.', 2001, ['USA', 'AFG', 'IRQ', 'IRN', 'PAK', 'SAU'], conquest()),
  E(125, 'Modern History', '2008 Becomes a Second Great Depression', 'Global financial institutions experience systemic collapse.', 2008, WORLD_MAJOR, tradeCloses()),
  E(126, 'Modern History', 'The 2008 Financial Crisis Never Happens', 'Politics, monetary policy and populism develop differently.', 2008, WORLD_MAJOR, tradeOpens()),
  E(127, 'Modern History', 'COVID-19 Never Emerges', 'Politics, work, medicine and supply chains keep their trajectories.', 2020, WORLD_MAJOR, plagueAverted()),
  E(128, 'Modern History', 'COVID-19 Is Far More Lethal', 'Civilization confronts a pandemic with dramatically higher mortality.', 2020, WORLD_MAJOR, plagueWorse()),
  E(129, 'Modern History', 'Russia Never Invades Ukraine in 2022', 'European security and energy policy follow another trajectory.', 2022, ['RUS', 'UKR', 'DEU', 'POL', 'FRA', 'USA'], tradeOpens()),
  E(130, 'Modern History', 'The Ukraine War Becomes a NATO-Russia War', 'Article 5 produces direct conflict between nuclear powers.', 2022, ['RUS', 'UKR', 'POL', 'DEU', 'USA', 'GBR', 'FRA'], populationCollapse()),

  // --- Technology & Science ---------------------------------------------
  E(131, 'Technology & Science', 'Babbage Builds the Analytical Engine', 'Programmable computing begins in the nineteenth century.', 1840, ['GBR', 'FRA', 'DEU', 'USA'], technologyEarly()),
  E(132, 'Technology & Science', 'Alan Turing Lives Into Old Age', 'Turing stays directly involved in computing and artificial intelligence.', 1954, ['GBR', 'USA'], technologyEarly()),
  E(133, 'Technology & Science', 'Nuclear Fission Is Never Discovered', 'Nuclear weapons and nuclear power never emerge.', 1938, WORLD_MAJOR, technologyLost()),
  E(134, 'Technology & Science', 'Fusion Power Is Commercialized in the 1970s', 'The global energy economy changes before the climate era.', 1975, WORLD_MAJOR, industrialise()),
  E(135, 'Technology & Science', 'The Space Shuttle Is Cheap and Reusable', 'Routine orbital access arrives decades earlier.', 1981, ['USA', 'RUS'], technologyEarly()),
  E(136, 'Technology & Science', 'Humans Land on Mars in the 1980s', 'Apollo evolves into a sustained interplanetary program.', 1985, ['USA', 'RUS'], technologyEarly()),
  E(137, 'Technology & Science', 'The Challenger Disaster Never Happens', 'The Shuttle program follows a different trajectory.', 1986, ['USA'], technologyEarly()),
  E(138, 'Technology & Science', 'The Chernobyl Disaster Never Happens', 'Public attitudes toward nuclear energy develop differently.', 1986, ['RUS', 'UKR', 'BLR', ...WEUROPE], technologyEarly()),
  E(139, 'Technology & Science', 'AI Reaches Modern Capability in 1995', 'Powerful machine intelligence arrives before broadband and smartphones.', 1995, WORLD_MAJOR, technologyEarly()),
  E(140, 'Technology & Science', 'The Internet and AI Arrive Together in the 1980s', 'Intelligent networked systems predate today’s institutions.', 1985, WORLD_MAJOR, technologyEarly()),
  E(141, 'Technology & Science', 'Quantum Computing Comes First', 'Modern computing develops around fundamentally different assumptions.', 1980, WORLD_MAJOR, technologyEarly()),
  E(142, 'Technology & Science', 'An Asteroid Is Detected on Course in 1960', 'Cold War rivals must build planetary defense together.', 1960, WORLD_MAJOR, technologyEarly()),
  E(143, 'Technology & Science', 'Viking Finds Life on Mars', 'Humanity knows by 1976 that life exists beyond Earth.', 1976, WORLD_MAJOR, culturalTurn()),
  E(144, 'Technology & Science', 'Extraterrestrials Contact Earth During the Cold War', 'Washington and Moscow confront a civilization-level external event.', 1965, WORLD_MAJOR, culturalTurn()),
  E(145, 'Technology & Science', 'A Confirmed Artificial Signal Is Detected Today', 'Another technological civilization exists, decades away.', 2024, WORLD_MAJOR, culturalTurn()),

  // --- Civilization-Level -----------------------------------------------
  E(146, 'Civilization-Level', 'Agriculture Is Never Invented', 'Humans remain predominantly hunter-gatherers.', -2900, [], agricultureFails()),
  E(147, 'Civilization-Level', 'Writing Is Invented 5,000 Years Earlier', 'Recorded civilization begins deep in prehistory.', -2950, [], technologyEarly()),
  E(148, 'Civilization-Level', 'The Wheel Is Never Invented', 'Transport and engineering develop through radically different technologies.', -2800, [], technologyLost()),
  E(149, 'Civilization-Level', 'The Printing Press Appears in Ancient Rome', 'Mass literacy arrives more than a millennium early.', 100, ROME, technologyEarly()),
  E(150, 'Civilization-Level', 'The Scientific Revolution Begins in Ancient Greece', 'Experimental science is institutionalized around 300 BC.', -300, ['GRC', 'EGY', 'TUR', 'ITA'], technologyEarly()),
  E(151, 'Civilization-Level', 'Industrialization Begins in the Roman Empire', 'Ancient steam technology becomes economically practical.', 100, ROME, industrialise()),
  E(152, 'Civilization-Level', 'Electricity Is Harnessed in the Middle Ages', 'Electrical technology develops before gunpowder empires.', 1200, EUROPE, technologyEarly()),
  E(153, 'Civilization-Level', 'There Is No Age of European Colonialism', 'Asia, Africa and the Americas industrialize under indigenous systems.', 1500, ['IND', 'CHN', 'NGA', 'ETH', 'MEX', 'PER', 'IDN', 'COD', 'GHA'], industrialise()),
  E(154, 'Civilization-Level', 'Africa Industrializes Before Europe', 'Global power relationships develop under radically different terms.', 1500, ['NGA', 'ETH', 'EGY', 'COD', 'GHA', 'MLI', 'ZAF', 'SDN', 'KEN', 'TZA'], industrialise()),
  E(155, 'Civilization-Level', 'The Americas Industrialize Before Contact', 'Explorers meet technologically sophisticated American states.', 1400, ['MEX', 'PER', 'USA', 'BOL', 'ECU', 'GTM', 'COL'], industrialise()),
  E(156, 'Civilization-Level', 'A Permanent Moon Colony in 1985', 'Space becomes a permanent geopolitical theater.', 1985, SUPERPOWERS, technologyEarly()),
  E(157, 'Civilization-Level', 'A Permanent Mars Colony by 2000', 'Humanity becomes multiplanetary before smartphones.', 2000, WORLD_MAJOR, technologyEarly()),
  E(158, 'Civilization-Level', 'A Genuine World Government After 1945', 'The UN develops sovereign authority over states.', 1945, WORLD_MAJOR, empireEndures()),
  E(159, 'Civilization-Level', 'Immediate Global Disarmament After 1945', 'Nuclear deterrence never organizes international security.', 1946, WORLD_MAJOR, tradeOpens()),
  E(160, 'Civilization-Level', 'Nuclear War Destroys the Major Powers', 'Civilization survives and is rebuilt by secondary powers.', 1983, WORLD_MAJOR, populationCollapse()),

  // --- Deep Dive ---------------------------------------------------------
  E(161, 'Deep Dive', 'Pax Germanica', 'Germany wins WWI. Follow the timeline from 1918 to 2026.', 1918, [...EUROPE, 'RUS', 'TUR'], conquest()),
  E(162, 'Deep Dive', 'The Confederate Century', 'The Confederacy survives. Track both Americas through the nuclear age.', 1863, ['USA', 'MEX', 'CAN', 'GBR'], empireBreaks()),
  E(163, 'Deep Dive', 'Rome Eternal', 'The Western Roman Empire survives and evolves into a modern state.', 400, ROME, empireEndures()),
  E(164, 'Deep Dive', 'Carthage Ascendant', 'Hannibal destroys Roman power and Carthage founds Western civilization.', -216, ['TUN', 'ITA', 'ESP', 'DZA', 'MAR', 'LBY'], conquest()),
  E(165, 'Deep Dive', 'The Byzantine Millennium', 'Constantinople never falls and the Eastern Empire reaches the modern era.', 1453, ['TUR', 'GRC', 'BGR', 'SRB', 'ROU'], empireEndures()),
  E(166, 'Deep Dive', 'The Mongol World', 'The Mongols conquer most of Europe and build the largest durable order in history.', 1242, [...STEPPE, ...EUROPE, 'IRN', 'IRQ'], conquest()),
  E(167, 'Deep Dive', 'Red America', 'A communist revolution succeeds in the United States during the Depression.', 1933, ['USA', 'RUS', 'MEX', 'CAN'], culturalTurn()),
  E(168, 'Deep Dive', 'Fortress Britain', 'Germany dominates the continent but Britain survives into a decades-long cold war.', 1941, [...EUROPE, 'RUS'], empireBreaks()),
  E(169, 'Deep Dive', 'The Nazi-Soviet Cold War', 'Germany defeats the USSR but not the Anglo-American powers.', 1943, [...EUROPE, 'RUS', 'USA', 'GBR'], conquest()),
  E(170, 'Deep Dive', 'The Nuclear Third World War', 'The Cuban Missile Crisis escalates. Model 72 hours to 2026.', 1962, WORLD_MAJOR, populationCollapse()),
  E(171, 'Deep Dive', 'Soviet Century', 'The USSR reforms instead of collapsing and stays a peer competitor.', 1985, ['RUS', 'UKR', 'KAZ', 'BLR', 'UZB', 'USA'], empireEndures()),
  E(172, 'Deep Dive', 'Apollo Never Ends', 'Moon bases, nuclear spacecraft, Mars missions, asteroid mining.', 1972, SUPERPOWERS, technologyEarly()),
  E(173, 'Deep Dive', 'The Victorian Computer Age', 'Babbage succeeds and triggers a nineteenth-century information revolution.', 1840, ['GBR', 'FRA', 'DEU', 'USA'], technologyEarly()),
  E(174, 'Deep Dive', 'The Ancient Industrial Revolution', 'Rome combines steam, mass production and experiment into real industry.', 100, ROME, industrialise()),
  E(175, 'Deep Dive', 'The First Contact Timeline', 'Humanity detects an intelligent civilization in 1965.', 1965, WORLD_MAJOR, culturalTurn()),
  E(176, 'Deep Dive', 'The Second Renaissance', 'The Library of Alexandria survives and anchors an uninterrupted scientific tradition.', -48, ['EGY', 'GRC', 'ITA', 'TUR', 'SYR'], technologyEarly()),
  E(177, 'Deep Dive', 'Vinland', 'Norse settlements survive in North America centuries before Columbus.', 1000, ['NOR', 'ISL', 'CAN', 'GRL', 'DNK', 'USA'], tradeOpens()),
  E(178, 'Deep Dive', 'The Indigenous Americas', 'Old World disease causes limited mortality and American states resist.', 1520, ['MEX', 'PER', 'USA', 'BOL', 'ECU', 'GTM', 'COL', 'BRA', 'CAN'], populationSpared()),
  E(179, 'Deep Dive', 'The Chinese Pacific', 'Ming China keeps Zheng He’s fleets and settles the Pacific and the Americas.', 1433, ['CHN', 'PHL', 'IDN', 'MEX', 'PER', 'USA', 'AUS'], tradeOpens()),
  E(180, 'Deep Dive', 'The Multipolar 2026', 'Several divergences combine into a world of roughly equal great powers.', 1500, ['USA', 'CHN', 'IND', 'NGA', 'BRA', 'TUR', 'RUS', 'DEU', 'MEX', 'IDN', 'EGY', 'ZAF'], tradeOpens()),
];

export const ERAS: readonly Era[] = [
  'Ancient World',
  'Medieval World',
  'Exploration & Early Modern',
  'Revolution & Early United States',
  'Civil War & Reconstruction',
  'Industrial & Imperial Age',
  'World War I',
  'World War II',
  'Cold War',
  'Modern History',
  'Technology & Science',
  'Civilization-Level',
  'Deep Dive',
];

export function entryById(id: string): CatalogueEntry | undefined {
  return CATALOGUE.find((entry) => entry.id === id);
}

// Referenced so the unmapped helper stays exported for future entries that have
// no structural reading at all.
export const UNMAPPED_EXAMPLE = unmapped('placeholder');
