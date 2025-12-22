
import { Lesson } from '../types';

export const STATIC_LESSONS: Lesson[] = [
    {
        id: 'maths_y3_add_2digit',
        title: '2-Digit Addition (Column Method)',
        year: 3,
        subject: 'Mathematics',
        curriculumStrand: 'Number - Addition & Subtraction',
        goal: 'Add numbers with up to three digits',
        video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        estimatedMinutes: 15,
        starterPolicy: { require: 'all', minScore: 1 },
        exitPolicy: { require: 'all', minScore: 0.8 },
        starters: [
            {
                id: "st1",
                type: "choice",
                prompt: "Which number is ODD?",
                options: [
                    { label: "7", correct: true },
                    { label: "12", correct: false }
                ]
            },
            {
                id: "st2",
                type: "choice",
                prompt: "What is double 15?",
                options: [
                    { label: "30", correct: true },
                    { label: "45", correct: false }
                ]
            },
            {
                id: "st3",
                type: "choice",
                prompt: "Which shape has 3 sides?",
                options: [
                    { label: "Triangle", correct: true },
                    { label: "Square", correct: false }
                ]
            },
            {
                id: "st4",
                type: "multi-choice",
                prompt: "Select ALL even numbers.",
                options: [
                    { label: "4", correct: true },
                    { label: "9", correct: false },
                    { label: "12", correct: true },
                    { label: "21", correct: false }
                ]
            },
            {
                id: "st5",
                type: "multi-choice",
                prompt: "Which pairs sum to 20?",
                options: [
                    { label: "10 + 10", correct: true },
                    { label: "15 + 4", correct: false },
                    { label: "18 + 2", correct: true },
                    { label: "11 + 9", correct: true }
                ]
            },
            {
                id: "st6",
                type: "multi-choice",
                prompt: "Select numbers greater than 50.",
                options: [
                    { label: "45", correct: false },
                    { label: "55", correct: true },
                    { label: "100", correct: true },
                    { label: "12", correct: false }
                ]
            },
            {
                id: "st7",
                type: "order",
                prompt: "Order from Smallest to Largest.",
                items: [
                    { id: "i1", content: "20" },
                    { id: "i2", content: "80" },
                    { id: "i3", content: "5" }
                ],
                correctOrder: ["i3", "i1", "i2"]
            },
            {
                id: "st8",
                type: "order",
                prompt: "Order from Largest to Smallest.",
                items: [
                    { id: "iA", content: "100" },
                    { id: "iB", content: "10" },
                    { id: "iC", content: "50" }
                ],
                correctOrder: ["iA", "iC", "iB"]
            },
            {
                id: "st9",
                type: "match",
                prompt: "Match the shape to sides.",
                pairs: [
                    { left: "Triangle", right: "3" },
                    { left: "Square", right: "4" },
                    { left: "Pentagon", right: "5" }
                ]
            },
            {
                id: "st10",
                type: "match",
                prompt: "Match units of time.",
                pairs: [
                    { left: "1 Minute", right: "60 Seconds" },
                    { left: "1 Hour", right: "60 Minutes" }
                ]
            }
        ],
        questions: [
            {
                id: 'q1',
                type: 'choice',
                time: 5,
                prompt: 'Which column do we add first?',
                options: [{ label: 'Ones', correct: true }, { label: 'Tens', correct: false }]
            },
            // New Video Questions (Total 3)
            {
                id: 'q2',
                type: 'multi-choice',
                time: 30, // Example time
                prompt: 'Which of these are valid ways to write "twenty-five"?',
                options: [
                    { label: '25', correct: true },
                    { label: '205', correct: false },
                    { label: 'Twenty-five', correct: true }
                ]
            },
            {
                id: 'q3',
                type: 'choice', // Visual match example within standard choice for now, or use Match type if implemented for video
                time: 60,
                prompt: 'Look at the video. How many carrots did the bunny eat?',
                options: [
                    { label: '1', correct: true },
                    { label: '5', correct: false },
                    { label: '10', correct: false }
                ]
            }
        ],
        exits: [
            {
                id: 'ex1',
                type: 'choice',
                prompt: 'Select correct: 23 + 12',
                options: [{ label: '35', correct: true }, { label: '45', correct: false }]
            },
            // New Exit Questions (Total 6)
            {
                id: 'ex2',
                type: 'match', // Visual Match
                prompt: 'Match the coin to its value.',
                pairs: [
                    { left: '1p', leftImage: 'https://upload.wikimedia.org/wikipedia/en/5/58/1p_British_coin_2008.png', right: 'One Penny' },
                    { left: '10p', leftImage: 'https://upload.wikimedia.org/wikipedia/en/0/06/10_pence_Coin_2008.jpg', right: 'Ten Pence' }
                ]
            },
            {
                id: 'ex3',
                type: 'order',
                prompt: 'Order the steps for Column Addition.',
                items: [
                    { id: 's1', content: 'Add the Ones' },
                    { id: 's2', content: 'Write the numbers' },
                    { id: 's3', content: 'Add the Tens' }
                ],
                correctOrder: ['s2', 's1', 's3']
            },
            {
                id: 'ex4',
                type: 'multi-choice',
                prompt: 'Which sums equal 10?',
                options: [
                    { label: '5 + 5', correct: true },
                    { label: '2 + 8', correct: true },
                    { label: '9 + 2', correct: false },
                    { label: '6 + 4', correct: true }
                ]
            },
            {
                id: 'ex5',
                type: 'choice',
                prompt: 'Is 99 + 1 equal to 100?',
                options: [
                    { label: 'Yes', correct: true },
                    { label: 'No', correct: false }
                ]
            },
            {
                id: 'ex6',
                type: 'cloze',
                prompt: 'Complete the sentence.',
                clozeText: 'Addition is finding the [total] of two or more [numbers].'
            }
        ]
    }
];
