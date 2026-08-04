import type { BackgammonKnowledgeCorpus } from "../model";

// Generated from packages/backgammon-knowledge/content/*.md. Do not edit manually.
export const backgammonKnowledgeCorpus: BackgammonKnowledgeCorpus = {
  schemaVersion: 1,
  taxonomyVersion: 1,
  entries: [
    {
      schemaVersion: 1,
      id: "kg.bar-entry-and-inner-board",
      title: "Entering from the Bar and Respecting the Inner Board",
      summary:
        "Bar entry is a rule issue first, and a planning issue second: if you can enter, where you enter affects both safety and future contact.",
      learnerLevel: "beginner",
      track: "safety-risk",
      concepts: ["bar-entry", "inner-board", "hits", "safety", "risk"],
      contexts: ["current-position", "move-outcome", "history-turn"],
      aliases: [
        "enter from the bar",
        "coming in from the bar",
        "bar entry",
        "inner board strength"
      ],
      provenance: {
        kind: "project-authored",
        label: "Backgammon Trainer curated knowledge"
      },
      body: "If you have a checker on the bar, the rules decide whether you can enter at all. After that, strategy begins. A weak opposing inner board makes entry less dangerous; a strong one makes every loose entry more painful because follow-up hits become easier. When choices exist, compare how exposed the entering checker is, whether the move also improves your own board, and whether entering creates or escapes contact."
    },
    {
      schemaVersion: 1,
      id: "kg.bearing-off-basics",
      title: "Bearing Off Without Forgetting the Position",
      summary:
        "Bearing off is often about efficiency, but contact and shots still matter until the game is truly just a race.",
      learnerLevel: "beginner",
      track: "game-plan-recognition",
      concepts: ["bearing-off", "race", "safety", "risk"],
      contexts: ["current-position", "move-outcome", "history-turn", "game-review"],
      aliases: ["bearing off", "bear off", "how should i bear off", "is this just a race"],
      provenance: {
        kind: "project-authored",
        label: "Backgammon Trainer curated knowledge"
      },
      body: 'Endgame decisions usually fall into three buckets: pure race, bearoff efficiency, or tactical endings with real shot danger. Confirm which bucket you are in before choosing a move.\n\nIn a pure bearoff, efficiency matters: clear points smoothly, avoid unnecessary wastage, and keep checker distribution usable for future rolls. Even distributions often waste fewer pips than awkward stacks.\n\nIf contact or direct shots still exist, bearoff technique alone is not enough. A fast-looking move can still be wrong if it gives a high-value shot.\n\nUse short names for recurring study patterns so review conversations stay clear: "one-gap bearoff," "last-roll shot race," and "late-contact bearoff." Keep names stable and attach rollout references later when authoritative evaluator evidence is available.'
    },
    {
      schemaVersion: 1,
      id: "kg.blitz-holding-and-backgame-plans",
      title: "Blitz, Holding, and Back Game Plans",
      summary:
        "Contact game families use different risk profiles, and each plan fails in predictable ways when timing and structure are ignored.",
      learnerLevel: "intermediate",
      track: "game-plan-recognition",
      concepts: ["game-plan", "hits", "contact", "anchors", "risk", "structure", "race"],
      contexts: ["current-position", "move-outcome", "history-turn", "game-review"],
      aliases: ["blitz plan", "holding game", "back game", "contact game plans"],
      provenance: {
        kind: "project-authored",
        label: "Backgammon Trainer curated knowledge"
      },
      body: "Blitz plan: hit and keep initiative before the opponent can anchor or escape. This usually needs board strength and enough attacking material to continue pressure.\n\nHolding game: keep one anchor, preserve contact, and wait for a high-value shot. It is often quieter than blitzing and depends on patience plus racing awareness.\n\nBack game: two anchors with comeback potential, but high timing cost. It is often overused by improving players. Without front-position discipline, a back game can collapse into a losing crunch.\n\nHeuristics like zone-checker counts can help quick evaluation, but they are not absolute laws. Use them with board strength, timing, and return-shot risk."
    },
    {
      schemaVersion: 1,
      id: "kg.blots-hits-and-tempo",
      title: "Blots, Hits, and Tempo",
      summary:
        "A blot is a target, and a hit changes time as well as structure because the opponent may need a whole turn to re-enter.",
      learnerLevel: "beginner",
      track: "hitting-tempo",
      concepts: ["blots", "hits", "tempo", "contact", "risk"],
      contexts: ["current-position", "move-outcome", "history-turn"],
      aliases: ["should i hit", "hitting here", "what are the pros and cons of hitting", "tempo"],
      provenance: {
        kind: "project-authored",
        label: "Backgammon Trainer curated knowledge"
      },
      body: 'Hitting is not just about removing a checker from the board. It also steals time because the opponent may need to enter from the bar before doing anything useful. That tempo gain can be large in contact games.\n\nNot every hit is good. Compare the cost: do you leave easy return shots, break an important point, or damage your own structure? A practical habit is to ask both questions together: what do I gain by sending the checker back, and what do I give up to do it?\n\nIn attacking positions, "more checkers in the zone" is a useful heuristic for whether an attack can continue, but it is not a law. Use it as a quick check, then confirm with board strength, return-shot risk, and race context.'
    },
    {
      schemaVersion: 1,
      id: "kg.board-vision-first-look",
      title: "First Look at a Position",
      summary:
        "Start with the current facts: contact or race, bar checkers, immediate shots, and what each side is trying to build.",
      learnerLevel: "beginner",
      track: "board-vision",
      concepts: ["current-position", "race", "contact", "game-plan"],
      contexts: ["current-position", "move-outcome", "history-turn"],
      aliases: [
        "what should i be looking at",
        "what should i look at",
        "what matters in this position",
        "how do i read this position"
      ],
      provenance: {
        kind: "project-authored",
        label: "Backgammon Trainer curated knowledge"
      },
      body: 'Start with facts before ideas. Use this quick sequence:\n\n1. Is there still contact, or is this now a race?\n2. Who is ahead in the race by a meaningful margin?\n3. Which side has the stronger board and better structure?\n4. Which plan is most likely: race, prime, blitz, holding game, or back game?\n\nIf contact remains, hitting chances, anchor value, and board strength usually matter more than raw speed alone. If contact is gone, efficient racing and bearoff technique take over.\n\nA common beginner mistake is skipping classification and jumping to a slogan like "play safe" or "just run." Good moves are conditional. In some contact positions, a quieter move loses too much initiative. In some prime battles, being slightly behind in the race can help timing.'
    },
    {
      schemaVersion: 1,
      id: "kg.common-mistakes-and-myths",
      title: "Common Mistakes and Myths",
      summary:
        "Frequent backgammon myths become teachable when reframed as conditional rules tied to position type, timing, and structure.",
      learnerLevel: "intermediate",
      track: "move-review",
      concepts: [
        "move-review",
        "candidate-comparison",
        "race",
        "contact",
        "structure",
        "risk",
        "game-plan"
      ],
      contexts: ["current-position", "history-turn", "game-review"],
      aliases: ["common mistakes", "backgammon myths", "why safe was wrong", "recurring errors"],
      provenance: {
        kind: "project-authored",
        label: "Backgammon Trainer curated knowledge"
      },
      body: "Myth: if you are ahead in the race, every play should become safer. Reality: in contact games, board strength and timing can outweigh raw race lead.\n\nMyth: a back game is the default comeback plan. Reality: it is expensive and timing-sensitive, and often overbuilt.\n\nMyth: every made point must be kept forever. Reality: points are tools. Some points lose value and should be cleared when they no longer block or support your plan.\n\nMyth: move choice and later review are separate. Reality: good review asks whether the move improved the intended plan, not just whether the rollout favorite was missed."
    },
    {
      schemaVersion: 1,
      id: "kg.curriculum-ladders-and-practice",
      title: "Curriculum Ladders and Practice Order",
      summary:
        "Structured progression helps learners transfer strategy by sequencing board reading, move comparison, and review habits.",
      learnerLevel: "beginner",
      track: "move-review",
      concepts: [
        "legal-moves",
        "bar-entry",
        "bearing-off",
        "move-review",
        "game-plan",
        "candidate-comparison"
      ],
      contexts: ["history-turn", "game-review"],
      aliases: [
        "study plan",
        "what should i learn next",
        "curriculum ladder",
        "beginner to intermediate"
      ],
      provenance: {
        kind: "project-authored",
        label: "Backgammon Trainer curated knowledge"
      },
      body: "Beginner ladder: legal move completion, bar entry, bearing off, blot awareness, point making, and first-pass position classification.\n\nIntermediate ladder: opening principles, builder logic, duplication, flexibility, contact-game plan selection, and better move comparisons.\n\nPractice loop: explain your move, compare with one alternative, extract one rule for next time, then test that rule in later positions. This keeps review active instead of passive.\n\nUse progressive disclosure. Give simple language first, then add detail only when the learner asks for it or when the mistake pattern repeats."
    },
    {
      schemaVersion: 1,
      id: "kg.example-dialogue-patterns",
      title: "Example Dialogue Patterns",
      summary:
        "Reusable coaching conversation patterns help move explanations stay clear, factual, and learner-centered.",
      learnerLevel: "intermediate",
      track: "move-review",
      concepts: ["move-review", "candidate-comparison", "game-plan", "contact", "structure"],
      contexts: ["history-turn", "game-review"],
      aliases: [
        "coaching dialogue",
        "how should coach answer",
        "move explanation pattern",
        "misconception correction"
      ],
      provenance: {
        kind: "project-authored",
        label: "Backgammon Trainer curated knowledge"
      },
      body: "Move explanation pattern:\nCoach starts with position classification, then compares two legal candidates, then gives one practical takeaway.\n\nMisconception correction pattern:\nCoach names the mistaken rule, states the conditional version, and ties it to concrete board facts from the turn.\n\nSmall bot-gap pattern:\nCoach frames close evaluator disagreement as concept weighting, not as player failure, then identifies one concept to practice next.\n\nThese patterns are templates for tone and structure. They do not override deterministic evidence boundaries."
    },
    {
      schemaVersion: 1,
      id: "kg.faq-and-analogies",
      title: "FAQ and Analogies for Explanations",
      summary:
        "Alternative phrasings help coaching stay conversational while preserving the same factual concepts and decision logic.",
      learnerLevel: "beginner",
      track: "move-review",
      concepts: ["move-review", "game-plan", "structure", "contact", "risk"],
      contexts: ["current-position", "history-turn"],
      aliases: [
        "explain it simply",
        "coaching analogy",
        "why is this move better",
        "explain timing"
      ],
      provenance: {
        kind: "project-authored",
        label: "Backgammon Trainer curated knowledge"
      },
      body: "Q: Why is slotting good here?\nA: It is an investment, not a random blot. You accept some risk now to improve many future point-making rolls.\n\nQ: Why did I lose timing?\nA: You ran out of useful small moves before your strategic job was done.\n\nAnalogy: A prime is both a roadblock and a traffic lane for your own checkers.\n\nAnalogy: A holding game is a loaded trap. You are preserving contact until the shot appears.\n\nAnalogy: A back game is a compressed spring. It is powerful only if your front structure can survive long enough."
    },
    {
      schemaVersion: 1,
      id: "kg.glossary-core-terms",
      title: "Core Terms for Position Talk",
      summary:
        "Shared definitions for frequent coaching terms so explanations stay consistent across reviews and current-position questions.",
      learnerLevel: "beginner",
      track: "board-vision",
      concepts: ["anchors", "blots", "hits", "tempo", "structure", "race", "contact", "game-plan"],
      contexts: ["current-position", "move-outcome", "history-turn"],
      aliases: [
        "glossary",
        "core terms",
        "what is an anchor",
        "anchor definition",
        "what does anchor mean",
        "what does timing mean",
        "define backgame"
      ],
      provenance: {
        kind: "project-authored",
        label: "Backgammon Trainer curated knowledge"
      },
      body: "Anchor: a point you own in the opponent home board that keeps contact and can reduce attack risk.\n\nBlot: a single exposed checker that can be hit.\n\nBuilder: a checker placed where many next rolls can help make a useful point.\n\nPrime: a consecutive blockade that limits movement; stronger structure and better timing usually matter more than raw length alone.\n\nHolding game: a contact plan built around one anchor and a later shot chance.\n\nBack game: contact with two anchors, usually powerful only when timing can survive long enough.\n\nTiming: how many useful moves you still have before you must break the structure your plan depends on.\n\nDuplication: forcing the opponent good numbers to overlap so one roll solves fewer problems.\n\nFlexibility: keeping future constructive options open instead of locking checkers too early.\n\nVolatility: how quickly position value can swing because hits, covers, escapes, or shot sequences are likely.\n\nCash point and take point are cube terms and are intentionally out of scope for the current checker-play runtime corpus."
    },
    {
      schemaVersion: 1,
      id: "kg.legal-move-choices",
      title: "Comparing Legal Move Choices",
      summary:
        "Legal moves use the dice in specific ways, so compare the full legal candidates rather than only one attractive-looking step.",
      learnerLevel: "beginner",
      track: "move-review",
      concepts: ["legal-moves", "dice-use", "candidate-comparison", "move-review"],
      contexts: ["current-position", "move-outcome", "history-turn"],
      aliases: [
        "why not",
        "candidate moves",
        "compare these moves",
        "why this move instead",
        "legal move choices"
      ],
      provenance: {
        kind: "project-authored",
        label: "Backgammon Trainer curated knowledge"
      },
      body: "In backgammon, a move is the whole legal use of the dice, not just one step that looks appealing in isolation. When you compare candidates, ask what each full move achieves after both dice are used: does it leave blots, make points, hit, improve builders, or waste pips? It is normal for one step to look good while the full move is awkward. That is why the coach should compare legal outcomes, not imagined partial moves."
    },
    {
      schemaVersion: 1,
      id: "kg.making-points-and-anchors",
      title: "Making Points and Building Anchors",
      summary:
        "Made points block movement, improve safety, and can become either attack points or anchors depending on whose side of the board they are on.",
      learnerLevel: "beginner",
      track: "making-points",
      concepts: ["made-points", "anchors", "inner-board", "structure", "safety"],
      contexts: ["current-position", "move-outcome", "history-turn"],
      aliases: ["making a point", "why does making a point matter", "anchor", "made point"],
      provenance: {
        kind: "project-authored",
        label: "Backgammon Trainer curated knowledge"
      },
      body: "A made point does several jobs at once: it gives your own checkers a safe landing place, blocks the opponent, and shapes the next few turns. In your home board, made points strengthen attacks. In the opponent's home board, they become anchors that preserve contact and survival.\n\nBuilders matter because they prepare future point-making. A good builder sits where many rolls can improve your structure. When two plays look similar now, prefer the one that keeps more useful future numbers.\n\nTeach duplication and flexibility together. Duplication means the opponent's best numbers overlap, so one roll cannot solve everything. Flexibility means your own spare-checker layout keeps multiple constructive plans alive. Backloaded spare checkers are often more flexible than frontloaded ones."
    },
    {
      schemaVersion: 1,
      id: "kg.opening-principles-first",
      title: "Opening Principles Before Memorization",
      summary:
        "Opening play improves fastest by learning principles first, then specific replies, while avoiding random early commitments.",
      learnerLevel: "intermediate",
      track: "move-review",
      concepts: [
        "game-plan",
        "made-points",
        "anchors",
        "structure",
        "risk",
        "candidate-comparison"
      ],
      contexts: ["current-position", "move-outcome", "history-turn"],
      aliases: [
        "opening principles",
        "should i slot early",
        "opening strategy",
        "split or make a point"
      ],
      provenance: {
        kind: "project-authored",
        label: "Backgammon Trainer curated knowledge"
      },
      body: "Start openings with principles, not giant reply tables. Ask what each candidate does for point making, builder quality, anchor competition, and future flexibility.\n\nEarly slotting is not automatically creative or strong. Treat it as an investment that needs clear upside compared with safer or more flexible alternatives.\n\nMany opening choices are close. Use this frame in review: which plan did the move support, what risk did it accept, and what future rolls did it improve or damage?\n\nMemorized sequences can help later, but principle-first reasoning transfers better to unfamiliar positions."
    },
    {
      schemaVersion: 1,
      id: "kg.pip-count-and-race-context",
      title: "Pip Count in Context",
      summary:
        "Pip count helps decisions, but race lead only becomes good play when interpreted with contact, timing, and shot risk.",
      learnerLevel: "beginner",
      track: "game-plan-recognition",
      concepts: ["race", "contact", "risk", "game-plan"],
      contexts: ["current-position", "move-outcome", "history-turn"],
      aliases: ["pip count", "race lead", "who is ahead in the race", "pip difference"],
      provenance: {
        kind: "project-authored",
        label: "Backgammon Trainer curated knowledge"
      },
      body: 'Pip count is information, not a plan by itself. In pure races, lower pip count is usually better. In contact games, race lead can be less important than board strength, anchor value, or timing.\n\nUse race margin, not only raw total, for practical over-the-board decisions. Then ask what that margin means here: does it support running, escaping, attacking, or waiting?\n\nShot math should stay practical for most learners. Counting direct and indirect shots, and comparing likely entering numbers, is often enough to explain why one move changes risk more than another.\n\nA useful coaching pattern is: race status first, then contact reality, then structure tradeoff. This prevents overusing "I am ahead, so I should always play safe" as a universal rule.'
    },
    {
      schemaVersion: 1,
      id: "kg.priming-and-prime-battles",
      title: "Priming and Prime Battles",
      summary:
        "Prime strategy depends on trapped checkers, spare distribution, and timing discipline rather than point count slogans.",
      learnerLevel: "intermediate",
      track: "game-plan-recognition",
      concepts: ["game-plan", "made-points", "structure", "race", "contact"],
      contexts: ["current-position", "move-outcome", "history-turn", "game-review"],
      aliases: ["prime", "priming game", "prime vs prime", "why did my prime fail"],
      provenance: {
        kind: "project-authored",
        label: "Backgammon Trainer curated knowledge"
      },
      body: "A prime blocks movement and also organizes your own traffic. Good priming decisions ask three things: how many enemy checkers are trapped, how durable your structure is, and whether your timing can keep the block intact.\n\nIn prime-vs-prime positions, being slightly ahead in the race is not always good. If it shortens your timing and forces an early break, the race lead can become a weakness.\n\nPrefer efficient prime shape over fragile prime length. A ragged long prime with dead checkers can fail faster than a shorter but flexible structure with useful spares.\n\nUse this concept with position classification first. If the game has already shifted to pure race, priming language is no longer the main frame."
    },
    {
      schemaVersion: 1,
      id: "kg.reusable-coaching-snippets",
      title: "Reusable Coaching Snippets",
      summary:
        "Short coaching lines improve consistency for tooltips, follow-up explanations, and compact move feedback.",
      learnerLevel: "beginner",
      track: "move-review",
      concepts: ["move-review", "game-plan", "contact", "risk", "structure", "hits", "anchors"],
      contexts: ["history-turn", "game-review"],
      aliases: [
        "short coaching snippet",
        "quick explanation",
        "feedback sentence",
        "move takeaway"
      ],
      provenance: {
        kind: "project-authored",
        label: "Backgammon Trainer curated knowledge"
      },
      body: "Anchor value: An anchor keeps you alive, keeps contact, and can improve future racing routes.\n\nTiming: Timing is how many useful moves remain before your structure must break.\n\nBad safety: Safer now can be weaker later if it removes too many constructive futures.\n\nBack game warning: Do not build a back game only because you are behind; check whether your front structure can survive first.\n\nMove review framing: Compare what changed in risk, structure, and plan support, not only the final roll outcome."
    },
    {
      schemaVersion: 1,
      id: "kg.reviewing-a-committed-move",
      title: "Reviewing a Committed Move",
      summary:
        "Move review should compare the chosen legal move against realistic alternatives and the position facts that changed, not against hindsight stories.",
      learnerLevel: "beginner",
      track: "move-review",
      concepts: ["move-review", "candidate-comparison", "game-plan", "legal-moves"],
      contexts: ["history-turn", "game-review"],
      aliases: [
        "review this move",
        "what happened on that turn",
        "was that move reasonable",
        "committed move review"
      ],
      provenance: {
        kind: "project-authored",
        label: "Backgammon Trainer curated knowledge"
      },
      body: "A good move review stays close to the decision that actually existed at the time. Start with the legal choices, the dice, the board facts, and any trustworthy evaluator evidence that was available. Then explain what changed: did the chosen move leave more blots, make fewer points, or miss a racing gain? Avoid hindsight language that depends on later rolls. The point of review is to improve future choices, not to pretend the player should have known future luck."
    },
    {
      schemaVersion: 1,
      id: "kg.safety-risk-running-structure",
      title: "Safety, Risk, Running, and Structure",
      summary:
        "Many checker plays trade short-term safety against long-term structure, so compare what becomes exposed now and what shape you keep for later.",
      learnerLevel: "beginner",
      track: "safety-risk",
      concepts: ["safety", "risk", "running", "structure", "candidate-comparison"],
      contexts: ["current-position", "move-outcome", "history-turn"],
      aliases: ["safe or risky", "should i run", "preserve structure", "play safe"],
      provenance: {
        kind: "project-authored",
        label: "Backgammon Trainer curated knowledge"
      },
      body: "A safer move usually tries to reduce direct shots and loose blots right away. A more active move may leave danger in exchange for better builders, more points, or racing progress. Neither label is automatically correct. Compare the actual trade: what shots exist after the move, what point structure survives, and whether the move helps your likely game plan. A strong beginner answer often starts with the real risks instead of using the word safe as if it settled the decision."
    },
    {
      schemaVersion: 1,
      id: "kg.timing-structure-and-volatility",
      title: "Timing, Structure, and Volatility",
      summary:
        "Many hard move explanations reduce to timing, shape quality, and how quickly outcomes can swing after one or two rolls.",
      learnerLevel: "intermediate",
      track: "game-plan-recognition",
      concepts: ["structure", "tempo", "race", "contact", "risk", "game-plan"],
      contexts: ["current-position", "move-outcome", "history-turn", "game-review"],
      aliases: ["timing", "position structure", "volatility", "why did my position collapse"],
      provenance: {
        kind: "project-authored",
        label: "Backgammon Trainer curated knowledge"
      },
      body: "Timing is your supply of useful moves before you must break something important. Structure is how efficient your made points and spare checkers are. Volatility is how fast outcomes can change because immediate tactical events are likely.\n\nIn prime battles, timing and structure often decide the game. A side forced to break first is frequently in trouble. This is why a small race deficit can still be strategically useful when it preserves prime timing.\n\nVolatility helps explain urgency. If many next-roll sequences hit, cover, or escape, a passive play may lose practical value quickly even when it looks safe right now.\n\nWhen reviewing a move, compare how each candidate changes these three dimensions, not only immediate blot count."
    }
  ]
};
