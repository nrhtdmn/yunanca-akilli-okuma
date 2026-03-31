// --- VARSAYILAN ALIŞTIRMALAR ---
const DEFAULT_PRACTICES = [
  {
    id: "prac-1",
    title: "Το Πρωινό του Κώστα (Kostas'ın Kahvaltısı)",
    level: "A1",
    category: "☕ Günlük Yaşam",
    text: "Ο Κώστας ξυπνάει κάθε μέρα στις εφτά το πρωί. Πηγαίνει στην κουζίνα και φτιάχνει καφέ. Δεν του αρέσει το τσάι. Συνήθως τρώει ψωμί με μέλι και ένα μήλο. Σήμερα όμως δεν έχει μέλι, έτσι τρώει μόνο ένα αυγό. Μετά το πρωινό, διαβάζει την εφημερίδα και φεύγει για τη δουλειά του.",
    questions: [
      { id: "q1", type: "tf", question: "Ο Κώστας ξυπνάει στις οκτώ.", answer: "false" },
      { id: "q2", type: "tf", question: "Στον Κώστα αρέσει πολύ ο καφές.", answer: "true" },
      { id: "q3", type: "mc", question: "Τι τρώει συνήθως ο Κώστας;", options: ["Ψωμί με τυρί", "Ψωμί με μέλι", "Μόνο φρούτα"], answer: "1" },
      { id: "q4", type: "fill-write", before: "Ο Κώστας πηγαίνει στην ", after: " και φτιάχνει καφέ.", answer: "κουζίνα" },
      { id: "q5", type: "fill-select", before: "Σήμερα ο Κώστας τρώει ένα ", after: " γιατί δεν έχει μέλι.", options: ["μήλο", "αυγό", "ψωμί"], answer: "αυγό" }
    ]
  }
];

// YENİ: Veriyi LocalStorage'dan al, yoksa varsayılanı kullan ve 'let' yap ki güncelleyebilelim.
let PRACTICE_CATALOG = JSON.parse(localStorage.getItem('y_practices_db')) || DEFAULT_PRACTICES;