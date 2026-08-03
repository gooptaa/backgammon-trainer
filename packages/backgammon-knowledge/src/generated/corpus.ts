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
      body: "In a pure bearoff, efficiency matters: clear points smoothly, avoid leaving unnecessary gaps, and use bigger numbers well. But beginners should first confirm whether the game is really a race. If contact or direct shots still exist, a technically efficient bearoff move can still be risky. Before treating the turn as simple racing math, check whether blots can be hit and whether a safer distribution gives up too much speed."
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
      body: "Hitting is not just about removing a checker from the board. It also steals time because the opponent may need to enter from the bar before doing anything useful. That gain can be worth real risk, but not every hit is good. Compare what the hit costs: do you leave return shots, break an important point, or ruin your own timing? A useful beginner habit is to ask both questions together: what do I gain by sending the checker back, and what do I give up to do it?"
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
      body: "Start with facts before ideas. Check whether the game is still in contact or has turned into a race, whether either side has checkers on the bar, and whether either player is under immediate hitting pressure. Then look at structure: where are the made points, where are the blots, and which side has a stronger inner board. A beginner does not need a perfect plan immediately, but should at least decide whether the turn is mainly about safety, making progress in the race, improving a point structure, or creating future contact."
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
      body: "A made point does several jobs at once: it gives your own checkers a safe landing place, blocks the opponent, and helps define the future shape of the game. In your home board, made points strengthen attacking chances. In the opponent's home board, they can become anchors that keep you alive and preserve future contact. Beginners often compare point-making plays to running plays because the point does not always win the race immediately, but it can improve safety and flexibility for many future turns."
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
    }
  ]
};
