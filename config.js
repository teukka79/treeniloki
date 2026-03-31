// --- CONFIGURATION ---

// KORVAA TÄMÄ: Kopioi tähän GitHubista se "Raw"-osoite (alkaa raw.githubusercontent.com...)
const JSON_URL = 'https://raw.githubusercontent.com/teukka79/treeniloki/refs/heads/main/liikkeet.json';

const BAR_DEFAULTS = { 
    "Suora tanko": 9.9, 
    "Mutka tanko": 6.8, 
    "Hex tanko": 17.0 
};

const MOVE_DEFAULTS = [
    "Penkkipunnerrus", 
    "Kyykky", 
    "Maastaveto", 
    "Pystypunnerrus tangolla", 
    "Kulmasoutu tangolla"
];

const SER_OPTS = [1, 2, 3, 4, 5, 6, 7, 8];
const REP_OPTS = ["1-5", "6-8", "8-10", "10-12", "12-15", "15-20"];

const INITIAL_PROGRAMS = { 
    "v1": { 
        name: "Voima", 
        exs: [{ id: "e1", n: "Pystypunnerrus", s: "3", r: "8-10", b: "Suora tanko" }] 
    } 
};