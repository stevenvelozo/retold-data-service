#!/usr/bin/env node
/**
 * Retold Bookstore Comprehension Generator
 *
 * Generates a stand-alone comprehension JSON file containing:
 *  - 10,000 Authors
 *  - 10,000 Books
 *  - ~15,000 BookAuthorJoin records
 *  - ~200 hilarious fictitious Reviewers (Users)
 *  - ~25,000 Reviews
 *
 * Shaped for the retold-harness schema (Book, Author, BookAuthorJoin, Review, User).
 */
'use strict';

const libFS = require('fs');
const libPath = require('path');
const libCrypto = require('crypto');

// ================================================================
// Deterministic PRNG (xorshift128+) so output is reproducible
// ================================================================
let _Seed0 = BigInt('0xBEEFCAFEDEAD1234');
let _Seed1 = BigInt('0xFACEFEED42424242');

function nextRandom()
{
	let tmpS1 = _Seed0;
	let tmpS0 = _Seed1;
	_Seed0 = tmpS0;
	tmpS1 ^= (tmpS1 << 23n) & 0xFFFFFFFFFFFFFFFFn;
	tmpS1 ^= tmpS1 >> 17n;
	tmpS1 ^= tmpS0;
	tmpS1 ^= tmpS0 >> 26n;
	_Seed1 = tmpS1;
	let tmpResult = Number((_Seed0 + _Seed1) & 0x7FFFFFFFFFFFFFFFn);
	return tmpResult / 0x7FFFFFFFFFFFFFFF;
}

function randInt(pMin, pMax)
{
	return Math.floor(nextRandom() * (pMax - pMin + 1)) + pMin;
}

function pick(pArray)
{
	return pArray[randInt(0, pArray.length - 1)];
}

function pickN(pArray, pN)
{
	let tmpCopy = pArray.slice();
	let tmpResult = [];
	for (let i = 0; i < pN && tmpCopy.length > 0; i++)
	{
		let tmpIdx = randInt(0, tmpCopy.length - 1);
		tmpResult.push(tmpCopy[tmpIdx]);
		tmpCopy.splice(tmpIdx, 1);
	}
	return tmpResult;
}

function uuid()
{
	return libCrypto.randomUUID();
}

function isoDate(pYear, pMonth, pDay)
{
	let tmpM = String(pMonth).padStart(2, '0');
	let tmpD = String(pDay).padStart(2, '0');
	return `${pYear}-${tmpM}-${tmpD}T00:00:00.000Z`;
}

function randomDate(pStartYear, pEndYear)
{
	let tmpYear = randInt(pStartYear, pEndYear);
	let tmpMonth = randInt(1, 12);
	let tmpDay = randInt(1, 28);
	let tmpHour = randInt(0, 23);
	let tmpMin = randInt(0, 59);
	let tmpSec = randInt(0, 59);
	return `${tmpYear}-${String(tmpMonth).padStart(2, '0')}-${String(tmpDay).padStart(2, '0')}T${String(tmpHour).padStart(2, '0')}:${String(tmpMin).padStart(2, '0')}:${String(tmpSec).padStart(2, '0')}.000Z`;
}

// ================================================================
// Name Data
// ================================================================
const FIRST_NAMES = [
	'Abigail', 'Alaric', 'Amara', 'Augustus', 'Barnaby', 'Beatrix', 'Benedict', 'Bernadette',
	'Calliope', 'Cassandra', 'Cedric', 'Clementine', 'Cornelius', 'Dagmar', 'Delphine', 'Desmond',
	'Ebenezer', 'Eloise', 'Erasmus', 'Esmeralda', 'Evangeline', 'Fabian', 'Felicity', 'Ferdinand',
	'Geraldine', 'Gideon', 'Griselda', 'Guinevere', 'Hadrian', 'Hortense', 'Ignatius', 'Imogen',
	'Jasper', 'Josephine', 'Juniper', 'Lavinia', 'Leopold', 'Lucinda', 'Magnus', 'Marguerite',
	'Maximilian', 'Millicent', 'Montgomery', 'Mortimer', 'Narcissa', 'Neville', 'Octavia', 'Ophelia',
	'Percival', 'Petronella', 'Philomena', 'Prudence', 'Quentin', 'Reginald', 'Rosalind', 'Rupert',
	'Sebastian', 'Seraphina', 'Sigmund', 'Sophronia', 'Thaddeus', 'Theodora', 'Ulysses', 'Valentina',
	'Winifred', 'Wolfgang', 'Xenophon', 'Yolanda', 'Zachariah', 'Zenobia', 'Aldous', 'Anastasia',
	'Bartholomew', 'Bianca', 'Cosimo', 'Dorothea', 'Edmund', 'Flora', 'Godfrey', 'Hermione',
	'Isadora', 'Jerome', 'Katarina', 'Lysander', 'Minerva', 'Nigel', 'Ottilie', 'Penelope',
	'Raphael', 'Sybil', 'Tobias', 'Ursula', 'Vivienne', 'Wilfred', 'Xander', 'Yvette'
];

const LAST_NAMES = [
	'Abernathy', 'Blackwood', 'Carmichael', 'Devereaux', 'Elderberry', 'Featherbottom', 'Grimshaw',
	'Hawthorne', 'Inglesworth', 'Jabberwock', 'Knickerbocker', 'Lumpkin', 'Muttonchop', 'Noodlebrain',
	'Obfuscate', 'Pumpernickel', 'Quagmire', 'Rumblebottom', 'Snorkeldink', 'Thistlethwaite',
	'Underpants', 'Vonderschmidt', 'Whipplesnaith', 'Xylophone', 'Yammerschnook', 'Zeppelinski',
	'Bumblesnort', 'Crumpetface', 'Dingleberry', 'Flapdoodle', 'Goosegrease', 'Humblebrag',
	'Jigglewhistle', 'Kettledrum', 'Lollygag', 'Mumblechops', 'Niffleheim', 'Oozelfinch',
	'Piddlesworth', 'Quibbleston', 'Rigmarole', 'Snotwhistle', 'Twaddlecock', 'Umbridge',
	'Wigglesworth', 'Bamboozle', 'Codswallop', 'Dillydally', 'Flibbertigibbet', 'Gobsmack',
	'Hullabaloo', 'Jumblefudge', 'Kerfuffle', 'Lollipop', 'Malarkey', 'Nincompoop',
	'Paddywack', 'Ramshackle', 'Skedaddle', 'Taradiddle', 'Whatchamacallit', 'Brouhaha',
	'Cattywampus', 'Discombobulate', 'Flummox', 'Gazump', 'Hodgepodge', 'Lickspittle',
	'Mudpuddle', 'Nubbins', 'Poppycock', 'Ragamuffin', 'Slapdash', 'Tomfoolery',
	'Widdershins', 'Zigzag', 'Ballyhoo', 'Claptrap', 'Donnybrook', 'Fiddle-faddle',
	'Gibberish', 'Hobbledehoy', 'Lickety-split', 'Muckraker', 'Namby-pamby', 'Piffle',
	'Razzmatazz', 'Skullduggery', 'Thingamajig', 'Whirligig', 'Balderdash', 'Canoodle',
	'Doohickey', 'Fandango', 'Gadabout', 'Higgledy-piggledy', 'Inglenook', 'Jalopy'
];

const AUTHOR_FIRST_NAMES = [
	'Agatha', 'Albert', 'Alice', 'Anton', 'Arthur', 'Barbara', 'Bertrand', 'Boris',
	'Charlotte', 'Clara', 'Dashiell', 'Doris', 'Dorothy', 'Edgar', 'Edith', 'Eleanor',
	'Emily', 'Ernest', 'Evelyn', 'Frances', 'Franz', 'Fyodor', 'Gabriel', 'George',
	'Gertrude', 'Graham', 'Gustave', 'Hannah', 'Harper', 'Harriet', 'Heinrich', 'Henry',
	'Herman', 'Hugo', 'Iris', 'Isaac', 'Ivan', 'Jack', 'James', 'Jane',
	'Jean-Paul', 'Jorge', 'Joseph', 'Joyce', 'Julio', 'Katherine', 'Kurt', 'Leo',
	'Louisa', 'Marcel', 'Margaret', 'Mark', 'Mary', 'Maya', 'Milan', 'Muriel',
	'Naguib', 'Nikolai', 'Octavio', 'Oscar', 'Pablo', 'Patricia', 'Philip', 'Ray',
	'Rebecca', 'Robert', 'Rosa', 'Salman', 'Samuel', 'Simone', 'Sylvia', 'Thomas',
	'Toni', 'Umberto', 'Ursula', 'Virginia', 'Vladimir', 'Voltaire', 'Walt', 'Willa',
	'William', 'Zadie', 'Zora', 'Chinua', 'Chimamanda', 'Orhan', 'Kazuo', 'Haruki',
	'Isabel', 'Italo', 'Yukio', 'Murasaki', 'Rabindranath', 'Rumi', 'Khalil', 'Nikos'
];

const AUTHOR_LAST_NAMES = [
	'Achebe', 'Adichie', 'Allende', 'Amis', 'Angelou', 'Asimov', 'Atwood', 'Austen',
	'Ballard', 'Balzac', 'Beckett', 'Borges', 'Bradbury', 'Brontë', 'Bulgakov', 'Calvino',
	'Camus', 'Capote', 'Carver', 'Cervantes', 'Chandler', 'Chekhov', 'Christie', 'Coelho',
	'Collins', 'Conrad', 'Cortázar', 'de Beauvoir', 'Dickens', 'Dostoevsky', 'Dumas', 'Eco',
	'Eliot', 'Ellison', 'Faulkner', 'Fitzgerald', 'Flaubert', 'Forster', 'Franzen', 'García Márquez',
	'Gibran', 'Goethe', 'Gogol', 'Golding', 'Grass', 'Greene', 'Hammett', 'Hardy',
	'Heller', 'Hemingway', 'Hesse', 'Hugo', 'Hurston', 'Huxley', 'Irving', 'Ishiguro',
	'James', 'Joyce', 'Kafka', 'Kazantzakis', 'Keats', 'Kerouac', 'Kipling', 'Kundera',
	'Le Guin', 'Lee', 'Lessing', 'Lewis', 'London', 'Lovecraft', 'Mahfouz', 'Mailer',
	'Mann', 'Maugham', 'McCarthy', 'McEwan', 'Melville', 'Miller', 'Mishima', 'Morrison',
	'Murakami', 'Nabokov', 'Naipaul', 'Neruda', 'Oates', 'Orwell', 'Pamuk', 'Pasternak',
	'Plath', 'Poe', 'Proust', 'Pynchon', 'Roth', 'Rushdie', 'Salinger', 'Saramago',
	'Sartre', 'Shelley', 'Shikibu', 'Smith', 'Solzhenitsyn', 'Steinbeck', 'Stendhal', 'Tagore',
	'Tolstoy', 'Twain', 'Updike', 'Verne', 'Vonnegut', 'Walker', 'Waugh', 'Welty',
	'Wharton', 'Whitman', 'Wilde', 'Woolf', 'Wright', 'Yeats', 'Zola'
];

const GENRES = [
	'Fiction', 'Literary Fiction', 'Science Fiction', 'Fantasy', 'Mystery', 'Thriller',
	'Romance', 'Horror', 'Historical Fiction', 'Adventure', 'Dystopian', 'Gothic',
	'Magical Realism', 'Satire', 'Western', 'Crime', 'Noir', 'Cyberpunk',
	'Steampunk', 'Post-Apocalyptic', 'Absurdist', 'Philosophical', 'Humor',
	'Young Adult', 'Graphic Novel', 'Memoir', 'Biography', 'True Crime',
	'Self-Help', 'Poetry', 'Drama', 'Essay Collection'
];

const BOOK_TYPES = ['Hardcover', 'Paperback', 'E-Book', 'Audiobook'];

const LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'zh', 'ko', 'ar', 'hi'];

// ================================================================
// Hilarious Book Title Generation
// ================================================================
function gerund(pVerb)
{
	if (pVerb.endsWith('e')) return pVerb.slice(0, -1) + 'ing';
	return pVerb + 'ing';
}

const TITLE_PATTERNS = [
	() => `The ${pick(TITLE_ADJ)} ${pick(TITLE_NOUN)}`,
	() => `${pick(TITLE_NOUN)} of the ${pick(TITLE_ADJ)} ${pick(TITLE_NOUN2)}`,
	() => `A Brief History of ${pick(TITLE_ABSURD)}`,
	() => `${gerund(pick(TITLE_VERB))} the ${pick(TITLE_NOUN)}`,
	() => `The ${pick(TITLE_ADJ)} ${pick(TITLE_NOUN)}'s Guide to ${pick(TITLE_ABSURD)}`,
	() => `Why ${pick(TITLE_NOUN2)}s ${pick(TITLE_VERB)} at Night`,
	() => `${pick(TITLE_NUMBER)} Shades of ${pick(TITLE_COLOR)}`,
	() => `The Secret Life of ${pick(TITLE_NOUN2)}s`,
	() => `${pick(TITLE_NOUN2)} and ${pick(TITLE_NOUN2)}: A Love Story`,
	() => `How to ${pick(TITLE_VERB)} Your ${pick(TITLE_NOUN2)} in ${pick(TITLE_NUMBER)} Easy Steps`,
	() => `The ${pick(TITLE_ADJ)} ${pick(TITLE_NOUN2)} Who ${pick(TITLE_VERB_PAST)} Too Much`,
	() => `Confessions of a ${pick(TITLE_ADJ)} ${pick(TITLE_NOUN2)}`,
	() => `Don't ${pick(TITLE_VERB)} the ${pick(TITLE_NOUN2)}`,
	() => `The ${pick(TITLE_NOUN2)} Who ${pick(TITLE_VERB_PAST)} ${pick(TITLE_PLACE)}`,
	() => `${pick(TITLE_NOUN2)}: The Untold Story`,
	() => `Everything You Wanted to Know About ${pick(TITLE_ABSURD)} But Were Afraid to Ask`,
	() => `${pick(TITLE_ADJ)} ${pick(TITLE_ABSURD)} and Other Lies I Tell Myself`,
	() => `The ${pick(TITLE_ADJ)} Art of ${gerund(pick(TITLE_VERB))} ${pick(TITLE_ABSURD)}`,
	() => `${pick(TITLE_EXCLAIM)}! A ${pick(TITLE_NOUN2)}'s Memoir`,
	() => `My ${pick(TITLE_NOUN2)} Is a ${pick(TITLE_ADJ)} ${pick(TITLE_NOUN)}`,
];

const TITLE_ADJ = [
	'Melancholy', 'Effervescent', 'Lugubrious', 'Phantasmagorical', 'Quixotic', 'Indolent',
	'Thunderous', 'Preposterous', 'Magnificent', 'Bewildered', 'Flatulent', 'Suspicious',
	'Cantankerous', 'Discombobulated', 'Flamboyant', 'Querulous', 'Inscrutable', 'Luminous',
	'Persnickety', 'Obstreperous', 'Crepuscular', 'Sesquipedalian', 'Defenestrated', 'Bamboozled',
	'Flabbergasted', 'Gobsmacked', 'Hornswoggled', 'Befuddled', 'Perpendicular', 'Translucent'
];

const TITLE_NOUN = [
	'Dinghy', 'Archipelago', 'Quandary', 'Haberdashery', 'Catacombs', 'Brouhaha',
	'Pandemonium', 'Labyrinth', 'Contraption', 'Kerfuffle', 'Rigmarole', 'Hullabaloo',
	'Phenomenon', 'Colosseum', 'Symposium', 'Conspiracy', 'Kaleidoscope', 'Anthology',
	'Emporium', 'Compendium', 'Conundrum', 'Extravaganza', 'Fiasco', 'Jamboree'
];

const TITLE_NOUN2 = [
	'Badger', 'Platypus', 'Walrus', 'Accountant', 'Pirate', 'Librarian', 'Iguana',
	'Astronaut', 'Gondolier', 'Yeti', 'Penguin', 'Taxidermist', 'Sausage', 'Kumquat',
	'Narwhal', 'Flamingo', 'Hedgehog', 'Beekeeper', 'Cartographer', 'Sommelier',
	'Wombat', 'Capybara', 'Sasquatch', 'Pudding', 'Hamster', 'Philosopher',
	'Lumberjack', 'Manatee', 'Barista', 'Zeppelin', 'Turnip', 'Octopus'
];

const TITLE_VERB = [
	'Juggle', 'Contemplate', 'Serenade', 'Befriend', 'Investigate', 'Negotiate',
	'Interrogate', 'Catapult', 'Marinate', 'Alphabetize', 'Domesticate', 'Hypnotize',
	'Procrastinate', 'Discombobulate', 'Bamboozle', 'Exfoliate', 'Gallivant', 'Perambulate'
];

const TITLE_VERB_PAST = [
	'Juggled', 'Contemplated', 'Serenaded', 'Befriended', 'Investigated', 'Negotiated',
	'Catapulted', 'Marinated', 'Alphabetized', 'Domesticated', 'Hypnotized', 'Vanquished',
	'Bamboozled', 'Exfoliated', 'Gallivanted', 'Perambulated', 'Discombobulated', 'Yodeled'
];

const TITLE_ABSURD = [
	'Quantum Socks', 'Interdimensional Cheese', 'Existential Laundry', 'Competitive Napping',
	'Artisanal Dust', 'Gluten-Free Darkness', 'Organic Regret', 'Dehydrated Water',
	'Bureaucratic Ecstasy', 'Weaponized Politeness', 'Industrial Whimsy', 'Tactical Knitting',
	'Philosophical Plumbing', 'Militant Optimism', 'Acoustic Gravity', 'Vintage Nonsense',
	'Performative Confusion', 'Recreational Mathematics', 'Theoretical Sandwiches', 'Applied Daydreaming',
	'Aggressive Tranquility', 'Passive-Aggressive Furniture', 'Hyperbolic Geometry', 'Sentient Yogurt'
];

const TITLE_COLOR = [
	'Beige', 'Taupe', 'Chartreuse', 'Puce', 'Mauve', 'Ecru', 'Cerulean', 'Vermillion',
	'Ochre', 'Magenta', 'Periwinkle', 'Maroon', 'Turquoise', 'Burgundy'
];

const TITLE_NUMBER = [
	'Seventeen', 'Forty-Two', 'Three-and-a-Half', 'Ninety-Nine', 'Seven Hundred',
	'Approximately Twelve', 'Pi', 'A Disturbing Number of', 'Far Too Many', 'Negative Six'
];

const TITLE_PLACE = [
	'at Midnight', 'in Prague', 'Under the Stairs', 'Behind the Fridge', 'in a Canoe',
	'on the Moon', 'During Brunch', 'in the Produce Aisle', 'at the DMV', 'Underwater'
];

const TITLE_EXCLAIM = [
	'Zounds', 'Great Scott', 'Good Grief', 'Thunderation', 'Egads', 'Crikey',
	'Balderdash', 'Fiddlesticks', 'Blimey', 'Sacré Bleu', 'Heavens to Betsy'
];

// ================================================================
// Hilarious Reviewer Personas and Review Templates
// ================================================================
const REVIEWER_PERSONAS = [
	{ first: 'Karen', last: 'Managerdemander', bio: 'Professional complainer, amateur sommelier' },
	{ first: 'Chad', last: 'Thunderflex', bio: 'Reads exclusively while doing bicep curls' },
	{ first: 'Gertrude', last: 'Miffington', bio: 'Has been personally offended by every book since 1987' },
	{ first: 'Bartholomew', last: 'Snifflebutt', bio: 'PhD in Unnecessarily Long Reviews' },
	{ first: 'Dolores', last: 'Umbridge-Adjacent', bio: 'Gives 1 star if the font displeases her' },
	{ first: 'Reginald', last: 'Pompington III', bio: 'Only reads leather-bound first editions, darling' },
	{ first: 'Brenda', last: 'Spoilerman', bio: 'Has never not spoiled an ending in a review' },
	{ first: 'Eugene', last: 'Tangentsworth', bio: 'Starts reviewing the book but ends up talking about soup' },
	{ first: 'Mildred', last: 'Catladyton', bio: 'Reviews all books from the perspective of her 17 cats' },
	{ first: 'Derek', last: 'One-Star', bio: 'Has literally never given anything more than one star' },
	{ first: 'Penelope', last: 'Plottwist', bio: 'Insists every book should have ended differently' },
	{ first: 'Harold', last: 'Didnt-Read', bio: 'Reviews books based solely on the cover' },
	{ first: 'Francesca', last: 'Dramática', bio: 'Describes every book as if it changed her molecular structure' },
	{ first: 'Norman', last: 'Footnote', bio: 'Reviews consist entirely of pedantic corrections' },
	{ first: 'Agatha', last: 'Conspiracy', bio: 'Finds hidden messages in every ISBN number' },
	{ first: 'Chester', last: 'Audiobook', bio: 'Only listens at 4x speed, very confused always' },
	{ first: 'Patricia', last: 'Wrong-Genre', bio: 'Keeps reviewing sci-fi books as if they were cookbooks' },
	{ first: 'Mortimer', last: 'Lengthy', bio: 'His reviews are always longer than the actual book' },
	{ first: 'Daphne', last: 'Emoji-Only', bio: 'Expresses all literary criticism through emoji descriptions' },
	{ first: 'Cornelius', last: 'Off-Topic', bio: 'Every review somehow becomes about his neighbor\'s lawn' },
	{ first: 'Gladys', last: 'Humblebrag', bio: 'Every review mentions her beach house in the Hamptons' },
	{ first: 'Lester', last: 'Misprint', bio: 'Found a typo on page 347 and will never recover' },
	{ first: 'Wanda', last: 'Five-Stars', bio: 'Gives everything five stars including parking tickets' },
	{ first: 'Frank', last: 'Spooked', bio: 'Is frightened by all genres including self-help' },
	{ first: 'Eunice', last: 'Metaphor', bio: 'Speaks exclusively in increasingly strained metaphors' },
	{ first: 'Percival', last: 'Snooze-Critic', bio: 'Rates books by how well they put him to sleep' },
	{ first: 'Tabitha', last: 'Bookclub', bio: 'Her bookclub is a front for her wine drinking operation' },
	{ first: 'Vincent', last: 'Margins', bio: 'Has strong opinions exclusively about kerning and margins' },
	{ first: 'Maude', last: 'Nostalgia', bio: 'Everything was better in a decade she wasn\'t alive for' },
	{ first: 'Nigel', last: 'Pedantic', bio: 'Actually, it\'s not a novel, it\'s a novella. Actually...' },
	{ first: 'Bunny', last: 'Chaos', bio: 'Returns library books to random shelves for sport' },
	{ first: 'Gerald', last: 'Overthink', bio: 'Still processing the implications of Green Eggs and Ham' },
	{ first: 'Helga', last: 'Booksmell', bio: 'Rates books 40% on content, 60% on the smell of the pages' },
	{ first: 'Clive', last: 'Clickbait', bio: 'You WON\'T BELIEVE what he thinks about chapter seven' },
	{ first: 'Doris', last: 'Dewey-Decimal', bio: 'Has strong feelings about the classification of this work' },
	{ first: 'Rufus', last: 'Dog-Ears', bio: 'Dog-ears every single page, fights anyone who objects' },
	{ first: 'Priscilla', last: 'Microphone', bio: 'Reads aloud in coffee shops to assert dominance' },
	{ first: 'Ambrose', last: 'Thesaurus', bio: 'Never uses a simple word when a grandiloquent one will suffice' },
	{ first: 'Blanche', last: 'Snack-Reader', bio: 'Cannot separate the reading experience from the snacks consumed' },
	{ first: 'Octavius', last: 'Sequel-Demand', bio: 'Demands a sequel to every book, including dictionaries' },
];

const REVIEW_TEMPLATES_POSITIVE = [
	(pBook) => `This book spoke to my soul. My soul then asked it to keep it down because it was trying to nap.`,
	(pBook) => `I laughed, I cried, I accidentally read the whole thing in the bathtub and now my copy is wavy.`,
	(pBook) => `Absolutely magnificent. I've recommended it to everyone I know, and several people I don't.`,
	(pBook) => `Five stars. Would have given six but the rating system is an oppressive construct.`,
	(pBook) => `I finished this book three weeks ago and I still can't talk about it without getting emotional. My therapist is concerned.`,
	(pBook) => `Better than anything I could write, and I once wrote a strongly worded letter to my HOA that made a grown man cry.`,
	(pBook) => `This is the book I didn't know I needed, much like that third slice of pie at 2am.`,
	(pBook) => `I was so engrossed I missed my subway stop. Twice. I don't even take the subway.`,
	(pBook) => `A tour de force. A chef-d'oeuvre. A magnum opus. I've been reading the thesaurus again, can you tell?`,
	(pBook) => `Every sentence is a gift. Every paragraph, a revelation. Every chapter, an excuse to ignore my responsibilities.`,
	(pBook) => `I read this in one sitting. My chiropractor says that was a mistake, but my heart says otherwise.`,
	(pBook) => `Changed my perspective on life, love, and the correct way to load a dishwasher.`,
	(pBook) => `Gave this to my book club. We were supposed to discuss it for an hour. It's been six months. We're still going.`,
	(pBook) => `My cat walked across the keyboard to type this: kkkkkjjjjj. She agrees it's phenomenal.`,
	(pBook) => `I highlighted so many passages my book is now entirely yellow. It's basically a legal pad at this point.`,
];

const REVIEW_TEMPLATES_NEGATIVE = [
	(pBook) => `I've read better prose on shampoo bottles. At least those have clear instructions.`,
	(pBook) => `One star. The only thing this book is good for is leveling my wobbly table, and even then the table complained.`,
	(pBook) => `I want the hours of my life back. And a formal apology. In writing. Notarized.`,
	(pBook) => `My neighbor's lawn looks better than this plot, and his lawn is TERRIBLE. Jeff, if you're reading this, mow it.`,
	(pBook) => `DNF. Did Not Finish. Did Not Enjoy. Did Not understand why this exists.`,
	(pBook) => `The author clearly wrote this during a fever dream and then just... published it? In THIS economy?`,
	(pBook) => `I found a typo on page 12 and honestly I never recovered. The trust was broken.`,
	(pBook) => `This book is the literary equivalent of stepping on a LEGO in the dark.`,
	(pBook) => `My reading group selected this. We are no longer a reading group. We are a support group.`,
	(pBook) => `I've had more compelling narratives from my dishwasher's error codes.`,
	(pBook) => `Put me to sleep faster than melatonin. Actually, I should thank the author. I haven't slept that well in years.`,
	(pBook) => `I got this for free and I still feel overcharged.`,
];

const REVIEW_TEMPLATES_MEDIUM = [
	(pBook) => `Three stars. It was fine. Like airport sushi — technically edible but you have questions.`,
	(pBook) => `A solid meh. Not bad enough to be interesting, not good enough to be memorable.`,
	(pBook) => `I've read worse. I've also read better. I've also read the back of cereal boxes, which was comparable.`,
	(pBook) => `The first half was brilliant. The second half was... present. It was definitely there.`,
	(pBook) => `It's the kind of book you read once, go "huh," and then forget about until someone mentions it at a party.`,
	(pBook) => `Three stars. Lost one star for the plot twist I saw coming from chapter two. Lost another because my sandwich got soggy while reading.`,
	(pBook) => `Some parts made me think. Other parts made me think about what I was going to have for dinner.`,
	(pBook) => `I'll say this: it's a book. It has pages. Words are on those pages. Some of them are in the right order.`,
	(pBook) => `Perfectly adequate. Like a beige wall. You don't hate it, but you're not hanging a frame around it either.`,
	(pBook) => `Would I recommend it? Maybe. Would I recommend it enthusiastically? I'd recommend it at room temperature.`,
];

const REVIEW_TEMPLATES_CHAOTIC = [
	(pBook) => `I haven't read this but the cover is blue and I'm a Sagittarius so three stars.`,
	(pBook) => `Great product! Shipping was fast. Oh wait, this is a book review? Same rating though.`,
	(pBook) => `I bought this thinking it was a cookbook. It is NOT a cookbook. Made the worst soup of my life from chapter 3.`,
	(pBook) => `I listened to this audiobook at 4x speed. I now speak exclusively in plot summaries and I can't stop.`,
	(pBook) => `My dog ate this book. Literally. He seemed to enjoy it more than I did. Giving him the review account.`,
	(pBook) => `Is this the one with the dragon? No? Then why did I read the whole thing thinking there'd be a dragon?`,
	(pBook) => `I read this during a power outage by candlelight and it was much more dramatic. Five stars for ambiance.`,
	(pBook) => `The ISBN contains the number 7 three times. Coincidence? I think not. There's something going on here.`,
	(pBook) => `My book club told me to read this. Joke's on them, I went to the wrong meeting and reviewed a different book entirely. Keeping the review.`,
	(pBook) => `I sneezed on page 47 and the book didn't say bless you. Rude. Deducting a star.`,
	(pBook) => `Accidentally brought this to jury duty instead of my actual reading. The defendant's lawyer was interested in my thoughts.`,
	(pBook) => `If this book were a sandwich, it would be one of those sandwiches where the bread is also a sandwich.`,
	(pBook) => `The font on page 193 is slightly different and now I can't unsee it. This is a cry for help.`,
];

// ================================================================
// Generator
// ================================================================

console.log('Generating bookstore comprehension data...');
let tmpStart = Date.now();

// --- Authors (10,000) ---
console.log('  Generating 10,000 authors...');
let tmpAuthors = [];
let tmpAuthorNameSet = new Set();

for (let i = 1; i <= 10000; i++)
{
	let tmpFirst, tmpLast, tmpFullName;
	do
	{
		tmpFirst = pick(AUTHOR_FIRST_NAMES);
		tmpLast = pick(AUTHOR_LAST_NAMES);
		// Add an optional suffix for uniqueness
		if (i > 2000)
		{
			let tmpSuffixes = ['', ' Jr.', ' Sr.', ' II', ' III', ' IV', ' von ' + pick(LAST_NAMES)];
			tmpLast = tmpLast + pick(tmpSuffixes);
		}
		tmpFullName = tmpFirst + ' ' + tmpLast;
	}
	while (tmpAuthorNameSet.has(tmpFullName));
	tmpAuthorNameSet.add(tmpFullName);

	tmpAuthors.push(
		{
			IDAuthor: i,
			GUIDAuthor: uuid(),
			CreateDate: randomDate(2015, 2024),
			CreatingIDUser: 1,
			UpdateDate: randomDate(2024, 2025),
			UpdatingIDUser: 1,
			Deleted: 0,
			DeleteDate: null,
			DeletingIDUser: 0,
			Name: tmpFullName,
			IDUser: 0,
			IDCustomer: 1
		});
}

// --- Books (10,000) ---
console.log('  Generating 10,000 books...');
let tmpBooks = [];
let tmpBookTitleSet = new Set();

for (let i = 1; i <= 10000; i++)
{
	let tmpTitle;
	do
	{
		tmpTitle = pick(TITLE_PATTERNS)();
	}
	while (tmpBookTitleSet.has(tmpTitle));
	tmpBookTitleSet.add(tmpTitle);

	let tmpGenre = pick(GENRES);
	let tmpType = pick(BOOK_TYPES);
	let tmpLang = pick(LANGUAGES);
	let tmpYear = randInt(1850, 2025);
	let tmpISBN = '978-' + randInt(0, 9) + '-' + String(randInt(100, 9999)).padStart(4, '0') + '-' + String(randInt(1000, 9999)) + '-' + randInt(0, 9);

	tmpBooks.push(
		{
			IDBook: i,
			GUIDBook: uuid(),
			CreateDate: randomDate(2015, 2024),
			CreatingIDUser: 1,
			UpdateDate: randomDate(2024, 2025),
			UpdatingIDUser: 1,
			Deleted: 0,
			DeleteDate: null,
			DeletingIDUser: 0,
			Title: tmpTitle,
			Type: tmpType,
			Genre: tmpGenre,
			ISBN: tmpISBN,
			Language: tmpLang,
			ImageURL: `https://covers.example.com/books/${i}.jpg`,
			PublicationYear: tmpYear,
			IDCustomer: 1
		});
}

// --- BookAuthorJoin (~15,000) ---
console.log('  Generating ~15,000 book-author joins...');
let tmpJoins = [];
let tmpJoinID = 1;

for (let i = 0; i < tmpBooks.length; i++)
{
	let tmpBook = tmpBooks[i];
	// Most books have 1 author, some have 2-3 co-authors
	let tmpAuthorCount = 1;
	let tmpRoll = nextRandom();
	if (tmpRoll > 0.65) tmpAuthorCount = 2;
	if (tmpRoll > 0.90) tmpAuthorCount = 3;

	let tmpAuthorIDs = pickN(
		Array.from({ length: 10000 }, (_, k) => k + 1),
		tmpAuthorCount
	);

	for (let a = 0; a < tmpAuthorIDs.length; a++)
	{
		tmpJoins.push(
			{
				IDBookAuthorJoin: tmpJoinID++,
				GUIDBookAuthorJoin: uuid(),
				IDBook: tmpBook.IDBook,
				IDAuthor: tmpAuthorIDs[a],
				IDCustomer: 1
			});
	}
}

// --- Hilarious Reviewers (Users) ---
console.log('  Generating hilarious reviewer personas...');
let tmpUsers = [];
let tmpReviewerCount = REVIEWER_PERSONAS.length;

// Generate the named personas first
for (let i = 0; i < tmpReviewerCount; i++)
{
	let tmpPersona = REVIEWER_PERSONAS[i];
	tmpUsers.push(
		{
			IDUser: i + 1,
			GUIDUser: i + 1,
			LoginID: (tmpPersona.first.toLowerCase() + '.' + tmpPersona.last.toLowerCase()).replace(/[^a-z.]/g, ''),
			Password: '',
			NameFirst: tmpPersona.first,
			NameLast: tmpPersona.last,
			FullName: tmpPersona.first + ' ' + tmpPersona.last,
			Config: '',
			IDCustomer: 1,
			Email: tmpPersona.first.toLowerCase() + '@' + tmpPersona.last.toLowerCase().replace(/[^a-z]/g, '') + '.reviews',
			Phone: '',
			Address: '',
			City: '',
			State: '',
			Postal: '',
			Country: ''
		});
}

// Generate 160 more silly randomized reviewers to reach ~200
for (let i = tmpReviewerCount; i < 200; i++)
{
	let tmpFirst = pick(FIRST_NAMES);
	let tmpLast = pick(LAST_NAMES);
	tmpUsers.push(
		{
			IDUser: i + 1,
			GUIDUser: i + 1,
			LoginID: (tmpFirst.toLowerCase() + '.' + tmpLast.toLowerCase()).replace(/[^a-z.]/g, ''),
			Password: '',
			NameFirst: tmpFirst,
			NameLast: tmpLast,
			FullName: tmpFirst + ' ' + tmpLast,
			Config: '',
			IDCustomer: 1,
			Email: tmpFirst.toLowerCase() + '@' + tmpLast.toLowerCase().replace(/[^a-z]/g, '') + '.reviews',
			Phone: '',
			Address: '',
			City: '',
			State: '',
			Postal: '',
			Country: ''
		});
}

// --- Reviews (~25,000) ---
console.log('  Generating ~25,000 reviews...');
let tmpReviews = [];
let tmpReviewID = 1;
let tmpAllReviewTemplates = [].concat(
	REVIEW_TEMPLATES_POSITIVE,
	REVIEW_TEMPLATES_NEGATIVE,
	REVIEW_TEMPLATES_MEDIUM,
	REVIEW_TEMPLATES_CHAOTIC
);

for (let i = 0; i < tmpBooks.length; i++)
{
	let tmpBook = tmpBooks[i];
	// Each book gets 0-5 reviews, averaging ~2.5
	let tmpReviewCount = randInt(0, 5);

	for (let r = 0; r < tmpReviewCount; r++)
	{
		let tmpUserID = randInt(1, 200);
		let tmpRating;
		let tmpTemplateSet;

		let tmpTemplateRoll = nextRandom();
		if (tmpTemplateRoll < 0.30)
		{
			tmpRating = randInt(4, 5);
			tmpTemplateSet = REVIEW_TEMPLATES_POSITIVE;
		}
		else if (tmpTemplateRoll < 0.50)
		{
			tmpRating = randInt(1, 2);
			tmpTemplateSet = REVIEW_TEMPLATES_NEGATIVE;
		}
		else if (tmpTemplateRoll < 0.75)
		{
			tmpRating = 3;
			tmpTemplateSet = REVIEW_TEMPLATES_MEDIUM;
		}
		else
		{
			tmpRating = randInt(1, 5);
			tmpTemplateSet = REVIEW_TEMPLATES_CHAOTIC;
		}

		let tmpTemplate = pick(tmpTemplateSet);
		let tmpText = tmpTemplate(tmpBook);

		tmpReviews.push(
			{
				IDReview: tmpReviewID++,
				GUIDReview: uuid(),
				CreateDate: randomDate(2018, 2025),
				CreatingIDUser: tmpUserID,
				UpdateDate: randomDate(2024, 2025),
				UpdatingIDUser: tmpUserID,
				Deleted: 0,
				DeleteDate: null,
				DeletingIDUser: 0,
				Text: tmpText,
				Rating: tmpRating,
				IDBook: tmpBook.IDBook,
				IDUser: tmpUserID,
				IDCustomer: 1
			});
	}
}

// ================================================================
// Assemble Comprehension
// ================================================================
let tmpComprehension =
{
	Author: tmpAuthors,
	Book: tmpBooks,
	BookAuthorJoin: tmpJoins,
	User: tmpUsers,
	Review: tmpReviews
};

let tmpElapsed = ((Date.now() - tmpStart) / 1000).toFixed(1);
console.log(`\nComprehension generated in ${tmpElapsed}s:`);
console.log(`  Authors:          ${tmpAuthors.length.toLocaleString()}`);
console.log(`  Books:            ${tmpBooks.length.toLocaleString()}`);
console.log(`  BookAuthorJoins:  ${tmpJoins.length.toLocaleString()}`);
console.log(`  Users (Reviewers):${tmpUsers.length.toLocaleString()}`);
console.log(`  Reviews:          ${tmpReviews.length.toLocaleString()}`);
console.log(`  Total records:    ${(tmpAuthors.length + tmpBooks.length + tmpJoins.length + tmpUsers.length + tmpReviews.length).toLocaleString()}`);

let tmpOutputPath = libPath.join(__dirname, 'bookstore-comprehension.json');
console.log(`\nWriting to ${tmpOutputPath}...`);
libFS.writeFileSync(tmpOutputPath, JSON.stringify(tmpComprehension, null, '\t'));

let tmpFileSizeMB = (libFS.statSync(tmpOutputPath).size / 1048576).toFixed(1);
console.log(`Done! (${tmpFileSizeMB} MB)`);
