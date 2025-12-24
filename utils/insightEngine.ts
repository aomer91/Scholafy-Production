
import { LessonResult, QuestionRecord } from '../types';

interface InsightResult {
    effortGrade: string;
    focusIndex: number;
    masteryLevel: 'PK' | 'WTS' | 'EXS' | 'GDS';
    insightText: string;
}

export const calculateInsights = (
    records: QuestionRecord[],
    scorePercent: number,
    lessonTitle: string,
    studentName: string
): InsightResult => {

    // 1. Separate Records by Phase
    const starters = records.filter(r => r.phase === 'starter');
    const exits = records.filter(r => r.phase === 'exit');
    const videos = records.filter(r => r.phase === 'video');

    // 2. Calculate Knowledge Delta (Growth)
    const starterScore = starters.length > 0 ? (starters.filter(r => r.isCorrect).length / starters.length) * 100 : 0;
    const exitScore = exits.length > 0 ? (exits.filter(r => r.isCorrect).length / exits.length) * 100 : 0;
    const knowledgeDelta = exitScore - starterScore;

    // 3. Define Mastery Level (Academic)
    let masteryLevel: 'PK' | 'WTS' | 'EXS' | 'GDS' = 'PK';
    if (scorePercent >= 90) masteryLevel = 'GDS';
    else if (scorePercent >= 65) masteryLevel = 'EXS';
    else if (scorePercent >= 35) masteryLevel = 'WTS';

    // 4. Calculate Focus Index (Behavioral)
    // - Penalize "Flash Guesses" (< 3s)
    // - Penalize "Zombie Pauses" (> 120s)
    // - Base score 100
    let focusScore = 100;
    let flashGuesses = 0;
    let zombiePauses = 0;
    let rushedAnswers = 0;

    records.forEach(r => {
        const duration = r.questionDurationSeconds || 0;

        // Skip video questions for strict timing analysis as they are paced
        if (r.phase === 'video') return;

        if (duration < 3 && !r.isCorrect) {
            flashGuesses++;
            focusScore -= 15; // Heavy penalty for guessing
        } else if (duration < 3 && r.isCorrect) {
            rushedAnswers++;
            focusScore -= 5; // Light penalty for rushing even if correct (could be luck)
        } else if (duration > 120) {
            zombiePauses++;
            focusScore -= 10; // Penalty for distraction
        }
    });

    // Clamp 0-100
    const focusIndex = Math.max(0, Math.min(100, Math.round(focusScore)));

    // 5. Calculate Effort Grade (Behavioral)
    // Based on Focus Index + Completion
    let effortGrade = 'C';
    if (focusIndex >= 90) effortGrade = 'A+';
    else if (focusIndex >= 80) effortGrade = 'A';
    else if (focusIndex >= 70) effortGrade = 'B';
    else if (focusIndex >= 50) effortGrade = 'C';
    else if (focusIndex >= 30) effortGrade = 'D';
    else effortGrade = 'F';

    // 6. Generate Narrative (The "Teacher's Voice")
    const narrative = generateNarrative({
        studentName,
        lessonTitle,
        masteryLevel,
        focusIndex,
        knowledgeDelta,
        flashGuesses,
        zombiePauses,
        startersCount: starters.length,
        starterScore
    });

    return {
        effortGrade,
        focusIndex,
        masteryLevel,
        insightText: narrative
    };
};

interface NarrativeParams {
    studentName: string;
    lessonTitle: string;
    masteryLevel: string;
    focusIndex: number;
    knowledgeDelta: number;
    flashGuesses: number;
    zombiePauses: number;
    startersCount: number;
    starterScore: number;
}

const generateNarrative = (params: NarrativeParams): string => {
    const { studentName, masteryLevel, focusIndex, knowledgeDelta, flashGuesses, zombiePauses, startersCount, starterScore } = params;

    const sentences: string[] = [];

    // --- Opening (Context) ---
    const openers = [
        `I've analyzed ${studentName}'s performance on this lesson.`,
        `Here is the breakdown for ${studentName}.`,
        `${studentName} has completed this session.`,
        `A detailed look at ${studentName}'s work.`
    ];
    sentences.push(openers[Math.floor(Math.random() * openers.length)]);

    // --- Focus & Behavior ---
    if (focusIndex >= 85) {
        sentences.push(`Attention was excellent throughout. No guessing detected.`);
    } else if (focusIndex >= 60) {
        sentences.push(`Focus was generally good, though there were minor lapses in concentration.`);
    } else {
        sentences.push(`Attention flagged significantly. I detected ${flashGuesses} rapid guesses.`);
    }

    // --- Learning Curve (The "Growth" Story) ---
    if (startersCount > 0) {
        if (knowledgeDelta > 30) {
            sentences.push(`This was a huge win. ${studentName} started with low confidence (${Math.round(starterScore)}% on starters) but mastered the material by the end. The video lesson was effective.`);
        } else if (starterScore > 80 && masteryLevel === 'GDS') {
            sentences.push(`${studentName} already knew this topic well starting out, and simply proved their mastery.`);
        } else if (knowledgeDelta < 0) {
            sentences.push(`Strangely, performance dipped after the starters. This might indicate cognitive fatigue or a tricky concept in the exit quiz.`);
        }
    }

    // --- Specific Issues ---
    if (zombiePauses > 0) {
        sentences.push(`Note: There were ${zombiePauses} instances where ${studentName} seemed stuck or distracted for over 2 minutes.`);
    }

    // --- Closing Recommendation ---
    if (masteryLevel === 'GDS') {
        sentences.push(`Recommendation: Ready for the next challenge.`);
    } else if (masteryLevel === 'EXS') {
        sentences.push(`Recommendation: Good to proceed, but review mistakes.`);
    } else {
        sentences.push(`Recommendation: I suggest re-sitting this lesson tomorrow.`);
    }

    return sentences.join(' ');
};

