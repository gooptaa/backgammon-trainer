# AI-Native Backgammon Knowledge and Documentation Architecture

## Research synthesis

The strongest current backgammon teaching stack is no longer a single book or single bot. It is a layered ecosystem: Paul Magriel’s *Backgammon* established the game’s first widely respected textbook-style conceptual vocabulary; Bill Robertie’s training materials shifted instruction toward stage-specific problems and decision training; Mochy and Marc Olsen’s newer work explicitly emphasizes strategic visualization, game-plan dynamics, back games, and cube action in unclear positions; and modern study culture now depends heavily on bot analysis, especially GNU Backgammon and eXtreme Gammon, plus organized educational platforms such as USBGF and Backgammon Galaxy. That historical arc matters because your project is trying to unify all of those roles inside one AI-native system. citeturn11search8turn11search4turn11search5turn12search5turn11search2turn15search7

The bot era changed teaching in two deep ways. First, it improved play strength: TD-Gammon famously showed that self-play reinforcement learning could reach near world-class strength, and later commercial/open tools such as Snowie, GNU Backgammon, and eXtreme Gammon turned elite analysis into routine study. Second, it changed *what* gets taught: opening conventions, slotting judgments, prime-vs-prime timing, backgame valuation, and score-specific cube handling are now taught with much more nuance than in many pre-bot books. Modern XG studies still show meaningful strength differences among analysis levels and programs, which is one reason analysis settings and rollout discipline matter if your platform eventually imports GNU/XG judgments. citeturn22view5turn23view0turn16search1turn16search2turn34view2

A high-confidence list of fundamentals still survives bot scrutiny. Advanced anchors remain strategically important; point-making still serves a dual purpose by both blocking the opponent and creating safe landing spots; primes, blitzes, races, and contact games remain the essential game-plan families; holding games still derive value from residual contact; and cube decisions still revolve around take points, cash points, gammon rates, and score. These are not obsolete ideas. What changed is the precision: modern teaching is less slogan-driven and more conditional. Magriel’s bold/safe criteria remain useful, but later expert teaching explicitly adds race status to anchor strength, board strength, and checkers-back count. citeturn14view4turn13view4turn27view3turn28view3turn31search0turn15search3

Several bot-era updates should be treated as high-confidence modern knowledge for your coaching corpus. In prime-vs-prime games, timing and structure dominate, and being slightly *behind* in the race can actually be good because it provides spare moves to maintain the prime. In blitzes, “men in the zone” is a practical teaching heuristic; Backgammon Galaxy’s current instructional rule of thumb is that 8 is weak, 9 is marginal, and 10–11 is strong. Spare-checker distribution matters more than many intermediate players realize: backloaded structures are usually more flexible than frontloaded ones. Deep backgames can be powerful only with enough timing; otherwise they collapse into crunches and gammons against you. citeturn27view1turn29search1turn29search2turn26search3turn28view0turn28view1

A few areas need explicit labeling as controversial or confidence-medium rather than universal truth. Exact opening rankings can shift by score, by rollout settings, and by which bot or rollout depth is used. Rules of thumb such as zone-count thresholds for blitzing are useful but not absolute laws. Deep backgames are often described as “strongest if timed properly,” but many modern teachers also stress that club players overbuild backgames and misjudge the timing burden. Those should be encoded in the knowledge base as “heuristics with exceptions,” not as flat doctrines. citeturn35view2turn29search1turn28view1

Some advice from older literature should be flagged as potentially obsolete or at least incomplete. USBGF’s opening education explicitly notes that “things have changed since the 70s,” and current teaching around early-game slotting is much more skeptical than older “pure style” dogma. For example, USBGF’s opening series treats many early splots as nearly always wrong unless alternatives are poor, and score can change the right opening play even on move one. Likewise, a rigid “make key points and prime at all costs” framework fails to capture modern bot-driven tradeoffs around race, volatility, gammons, and timing. citeturn35view2turn36search3turn36search2turn36search10

For the AI side, the research picture is similarly clear. Diátaxis remains one of the most useful high-level frameworks for separating tutorial, how-to, reference, and explanation, which is exactly the separation your repo needs because coding agents, contributors, and coaching agents have different information needs. For retrieval, current best practice is not “just embed everything.” Modern systems combine structured document design, semantic plus keyword search, metadata filters, and often reranking. OpenAI’s file search uses semantic and keyword search and supports metadata filtering; Anthropic’s contextual retrieval work shows measurable gains from prepending chunk-specific context before embedding and BM25 indexing; hybrid search combines lexical precision with semantic recall; and reranking improves the relevance of the final small set actually passed to the model. Knowledge graphs are valuable later for cross-document reasoning, but they are not the best first move for a repo that still needs clean source-of-truth documents. citeturn40search1turn18view0turn40search7turn40search4turn40search5turn40search8turn38view1turn38view3turn18view4turn18view7turn39view0turn18view6

The educational-design literature also aligns well with your vision. Practice testing and distributed practice are among the strongest broad learning strategies; interleaving, elaborative interrogation, and self-explanation are promising and especially relevant to strategy games; worked examples help novices but should be reduced as expertise increases; progressive disclosure reduces overload; deliberate practice needs clear goals, feedback, repetition, and refinement; and intelligent tutoring systems work best when they combine an “inner loop” of immediate hints/feedback with an “outer loop” that chooses the next task based on student progress. That is almost a blueprint for an AI coach that analyzes a move, asks why the learner chose it, gives calibrated help, and then assigns the *next* position or quiz rather than stopping at explanation. citeturn19view0turn19view1turn18view10turn19view2turn41view0turn41view1turn22view1turn18view12turn24view0turn25view1turn22view4turn21search4turn22view3

## Deliverable one knowledge base

The first-draft knowledge base should live in `knowledge/`, not `docs/`, because it is primarily for retrieval by runtime coaching agents and secondarily for human readers. The governing rule is: **small canonical concept documents beat long narrative chapters**. Runtime coaching needs reusable conceptual units, prerequisite links, multiple explanation styles, misconception notes, and example dialogue fragments. Human readers can still browse it, but the design center is AI retrieval quality. That design is consistent with modern chunking and RAG guidance: chunk boundaries should preserve meaning, documents should be coherent and self-describing, and retrieval should later combine semantic search, keyword retrieval, metadata filters, and reranking. citeturn18view5turn18view4turn38view1turn38view3turn39view0

Recommended tree:

```text
knowledge/
  README.md
  glossary/
    core-terms.md
  foundations/
    position-classification.md
    probability-pips-and-racing.md
  checker-play/
    anchors-builders-duplication-flexibility.md
    timing-structure-and-volatility.md
  strategies/
    priming.md
    blitz-holding-and-back-games.md
  cube/
    money-cube-basics.md
    match-play.md
  openings/
    opening-principles.md
  endgame/
    bearoff-and-reference-positions.md
  lessons/
    curriculum-ladders.md
  coaching/
    common-mistakes-and-myths.md
    faq-and-analogies.md
    example-dialogues.md
    reusable-snippets.md
```

All files should use lightweight YAML front matter with stable IDs and retrieval metadata such as `id`, `title`, `doc_type`, `audience`, `difficulty`, `topics`, `prerequisites`, `related`, `canonical_questions`, `updated_from`, and `source_strategy`. The point is not to satisfy a static site generator. The point is to make each file *self-identifying* for chunk contextualization, graph edges, and future metadata filtering. OpenAI’s file-search tooling already supports metadata filtering, and Anthropic’s contextual retrieval work strongly suggests that chunk-level context improves retrieval quality. citeturn38view3turn18view4

**Filename:** `knowledge/README.md`  
**Purpose:** entry point for runtime coaches and human readers  
**Audience:** all  
**Estimated size:** 500–700 words  
**Actual first-draft content:**  
This knowledge base is written for three readers at once: learners, human contributors, and future coaching agents. It is intentionally organized as many small concept documents rather than one long book. A coach should be able to answer “What is an anchor?”, “Why was my move too safe?”, and “Compare this to the last prime-vs-prime position” by retrieving a few focused files instead of scanning an entire chapter.  

Start with `foundations/position-classification.md`. The most important skill in backgammon is not memorizing slogans; it is classifying the position before choosing a plan. Ask first: Is this still a contact game? Who is ahead in the race? Which side has board strength? Are gammons important? Is the cube active? Those questions drive almost every strategic decision. Modern teaching across USBGF and Backgammon Galaxy is still built around recurring position families such as race, prime, blitz, holding game, and back game, but bot-era study makes the transitions and exceptions more explicit. citeturn35view1turn27view1turn28view3turn29search2  

When in doubt, retrieve by concept rather than phase. A learner asking about “slotting” may need opening principles, builder logic, and volatility together. A learner asking why a move was wrong may need the misconception notes more than a pure definition. Use `related` links liberally and prefer exact concept names over poetic titles.

**Filename:** `knowledge/glossary/core-terms.md`  
**Purpose:** canonical definitions for retrieval and UI hovercards  
**Audience:** beginners through advanced  
**Estimated size:** 900–1200 words  
**Actual first-draft content:**  
An **anchor** is a point you own in the opponent’s board. A **deep anchor** is on the ace or deuce point; an **advanced anchor** is farther forward and is usually more flexible. A **builder** is a checker placed where many future rolls can help make a useful point. A **blot** is a single exposed checker. A **prime** is a consecutive blockade, ideally four to six points long. A **full prime** is six in a row. A **holding game** is a contact position built around one advanced anchor and the hope of a later shot. A **back game** is a contact position with two anchors; it can create powerful turnaround chances, but only if timing survives long enough. citeturn37search0turn28view0turn28view3  

**Timing** means how many useful moves a position can make before it must break something important. **Duplication** means forcing the opponent’s good numbers to overlap, so one roll solves fewer problems. **Flexibility** means keeping future development options alive. **Volatility** means the position can change quickly in equity because of hits, covers, escapes, or market-losing rolls. **Cash point** is the point where a double becomes too good for the opponent to take; from your side, it is the opponent’s take point translated into your winning chances. citeturn37search0turn31search0turn15search1  

Use glossary definitions as anchors for retrieval, not as lessons. Every definition should link to a concept file that explains when the term matters, when the heuristic breaks, and how the learner should think over the board.

**Filename:** `knowledge/foundations/position-classification.md`  
**Purpose:** teach the first decision tree a coach should retrieve  
**Audience:** all, especially beginners and runtime coaches  
**Estimated size:** 700–900 words  
**Actual first-draft content:**  
Before choosing a move, classify the position. The fastest useful sequence is:  
First, **contact or no contact**. If the players have passed each other completely, the game is a race or bearoff problem. If contact remains, hitting, anchors, primes, and cube volatility matter more. Second, **who is ahead in the race**. Third, **which side has the stronger board**. Fourth, **what is the likely game plan**: race, prime, blitz, holding game, or back game. Fifth, **how alive is the cube**. citeturn37search0turn27view1turn29search2turn15search3  

This classification model should be the coach’s default opening move in conversation. If a learner asks “Why is this move better?”, the coach should often begin with “Because this is no longer primarily a racing decision” or “Because this is a prime-vs-prime position where timing matters more than raw pip count.” That framing teaches transfer, not just one answer.  

Common beginner error: skipping classification and jumping straight to “make the best point” or “run when ahead.” Those slogans are useful, but modern bot-informed play is about *conditional priorities*. In prime-vs-prime, being slightly behind in the race can be helpful because it buys timing. In backgames, a beautiful anchor structure can still fail if timing collapses first. citeturn27view1turn28view1

**Filename:** `knowledge/foundations/probability-pips-and-racing.md`  
**Purpose:** compact math foundation for pip count, market losers, and race teaching  
**Audience:** beginners to intermediate  
**Estimated size:** 900–1100 words  
**Actual first-draft content:**  
A pip count is not a strategy by itself. It is information that helps choose a strategy. In pure races, fewer pips is better. In contact positions, pip leadership can be less important than timing, board strength, or gammon danger. The coach should teach learners to ask “What does the count mean *here*?” rather than “Who is ahead?” only. Backgammon Galaxy’s current pip-count teaching explicitly emphasizes the *difference* in pips, because over-the-board decisions often need only the race margin, not an exact raw total. citeturn29search0turn27view1  

Probability instruction should stay practical. Learners need to know direct shots versus indirect shots, how many entering numbers exist, why market losers matter, and why volatility changes cube urgency. They do not need a full treatise on combinatorics in the first lesson. Use concrete patterns: eleven hit numbers feels very different from four; a position with many covers and return shots is more volatile than one with a quiet race lead.  

Teach pip counting with race-role interpretation. If you are ahead and still have back checkers, escaping often rises in priority. If you are behind and have contact, priming or attack may be right. If you are behind *inside* a prime-vs-prime, that may actually help your timing rather than hurt it. citeturn27view3turn27view1

**Filename:** `knowledge/checker-play/anchors-builders-duplication-flexibility.md`  
**Purpose:** teach transferable checker-play concepts  
**Audience:** beginners to advanced  
**Estimated size:** 1000–1300 words  
**Actual first-draft content:**  
An anchor gives survival, future contact, and often counterplay. Advanced anchors are usually more active than deep anchors because they still carry racing value and can interfere with clearing. Backgammon Galaxy’s current teaching treats the 20-point as the “golden point” because it combines safety against blitzes with future racing and jumping power. USBGF’s glossary and instructional content fit the same broad picture: anchors are not passive decorations; they define how much danger you can absorb and how much contact value remains. citeturn12search8turn28view3turn37search0  

Builders matter because good backgammon is often pre-emptive. A builder on a useful point threatens future development while keeping options open. That is why many strong opening and reply plays are favored: they place spare checkers where covers, points, and attacks remain available.  

Duplication and flexibility should be taught together. Duplication limits the opponent’s freedom by making their good numbers overlap. Flexibility protects your own freedom by keeping many future numbers constructive. Backloaded spare-checker structures are usually more flexible than frontloaded ones because more dice can improve the position constructively. This is a durable modern teaching point and should appear both in lesson files and in explanatory move commentary. citeturn26search3turn37search0

**Filename:** `knowledge/checker-play/timing-structure-and-volatility.md`  
**Purpose:** teach the coach’s explanatory vocabulary for hard positions  
**Audience:** intermediate to advanced  
**Estimated size:** 1000–1300 words  
**Actual first-draft content:**  
Timing is the ability to keep making useful plays without destroying the position you need. Structure is the shape and efficiency of your made points and spare checkers. Volatility is how quickly equity can swing after a few rolls. These three concepts explain a large share of “why” questions that frustrate improving players.  

In prime-vs-prime games, timing and structure are usually the headline issues. A pure efficient structure with useful spares lasts longer. A side that runs out of spare moves first is forced to break, and that often decides the game. Modern bot teaching is especially strong here: a small pip deficit can be desirable if it improves timing, because the race is serving the prime, not the other way around. citeturn27view1  

Volatility is the bridge from checker play to cube action. If the next roll may hit, cover, escape, or swing the take/pass window, then waiting on the cube becomes expensive. A coach should therefore be able to say not only “your move was worse” but “your move increased volatility without improving your board” or “your safe play gave up too many market-losing sequences.” Pair this file closely with the cube files.

**Filename:** `knowledge/strategies/priming.md`  
**Purpose:** canonical concept doc for primes and prime-vs-prime  
**Audience:** all  
**Estimated size:** 1000–1200 words  
**Actual first-draft content:**  
A prime is a blockade built to trap enemy checkers and control movement. Good prime teaching starts with one idea: points do not exist only to score territory; they function as both barriers and landing spaces. A prime therefore does two jobs at once. It blocks the opponent and organizes your own army. citeturn27view3  

In ordinary priming games, ask three questions: how strong is the structure, how many spare checkers support it, and how many enemy checkers are actually trapped behind it. In prime-vs-prime games, structure and timing dominate. Backgammon Galaxy’s current teaching is blunt on this point: the side forced to break first is usually losing, and better timing often means the side slightly behind in the race has the real strategic advantage. citeturn27view1  

Teach learners one anti-myth explicitly: “ahead in the race” is not always good. In prime battles it can be bad if it shortens your timing and forces an early collapse. Also teach one modern refinement: a pure efficient prime with useful spares is far better than a ragged prime with dead checkers. Coaches should use the vocabulary of **purity**, **efficiency**, and **spare distribution**, not only “five-prime” or “six-prime.” citeturn27view1turn26search3

**Filename:** `knowledge/strategies/blitz-holding-and-back-games.md`  
**Purpose:** one tightly linked contact-games cluster for retrieval  
**Audience:** all  
**Estimated size:** 1300–1600 words  
**Actual first-draft content:**  
A **blitz** is an attack-based plan: hit, keep hitting, and close points before the opponent can anchor or escape. It works best when your board is strong, your race is favorable, and you have enough “men in the zone” to continue the attack. Current Backgammon Galaxy teaching uses a memorable heuristic: 8 zone checkers is weak, 9 is marginal, and 10–11 is strong. Treat that as a teaching rule of thumb, not a law. citeturn29search1turn29search2  

A **holding game** is quieter contact. You hold an anchor, preserve contact, and wait for the opponent to leave a shot. Shallow holding games are often stronger earlier because they retain both contact and some racing chance; deep holding games can be better later when the opponent is already deep into the bearoff and you only need a late shot. citeturn28view3  

A **back game** is a holding game with two anchors. That extra contact can generate powerful turnarounds, but it comes with a brutal timing burden. Shallow back games are more robust but often less explosive; deep back games can be strongest *if* properly timed, but if the front position crunches first, the back game turns into a gammon trap for the side trying it. This is the exact kind of topic where the coach should distinguish between romantic backgame stories and practical win rates. citeturn28view0turn28view1

**Filename:** `knowledge/cube/money-cube-basics.md`  
**Purpose:** teach live cube reasoning for money play and unlimited games  
**Audience:** intermediate and advanced  
**Estimated size:** 900–1100 words  
**Actual first-draft content:**  
Money-cube reasoning starts with three practical questions: How often am I winning? How often am I winning a gammon? How likely is it that waiting one roll will lose my market? GNU Backgammon’s manual vocabulary around take point and cash point remains useful, and eXtreme Gammon’s interface reflects the same core structure by showing cubeless equity, cubeful equities, recommended actions, and the difference between actions. citeturn31search0turn13view0turn14view0  

A good coach should explain cube action in English before math. “Double because many sequences pass your opponent next roll” is often a better first explanation than raw equity. Then the coach can deepen the answer with take-point math, gammon implications, or volatility. This is especially important for conversational tutoring, because learners often ask “Why now?” not “What is the exact equity?”  

Do not teach cube action as a static threshold. Cube urgency depends on volatility, redouble potential, gammons, and whether the opponent still has realistic counterplay through contact or timing. Use this file with `timing-structure-and-volatility.md` and `match-play.md`.

**Filename:** `knowledge/cube/match-play.md`  
**Purpose:** match-score-aware cube and opening teaching  
**Audience:** intermediate and advanced  
**Estimated size:** 1000–1300 words  
**Actual first-draft content:**  
Match play changes checker play and cube play because points are not all equal. USBGF’s current opening education explicitly shows that opening 64 can legitimately shift between alternatives depending on whether you need gammons, need safety, or are playing a score where gammons no longer help. Their teaching example is excellent: making the 2-point increases tactical gammon chances and can be right when trailing badly, while safer alternatives may be preferred when avoiding gammons matters more. citeturn35view2turn15search8  

Teach three match-play habits early. First, ask whether gammons help or hurt either side. Second, ask whether you are near a score where cube timing becomes unusual. Third, remember that some opening and early-contact choices become score-sensitive before most learners expect them to.  

This file should also define Crawford, post-Crawford, mandatory doubles, and match winning chances in practical language. The goal is not a full match-equity treatise in one doc. The goal is enough structure that the coach can retrieve the right frame when the learner asks, “Would this still be right at double match point?” USBGF, GNU Backgammon, and XG all reinforce the same big lesson: match score is not a footnote. It changes the game. citeturn15search3turn15search1turn37search0

**Filename:** `knowledge/openings/opening-principles.md`  
**Purpose:** principles-first opening knowledge, not giant rollout tables  
**Audience:** all  
**Estimated size:** 1100–1400 words  
**Actual first-draft content:**  
Opening study should not begin as memorization of 1296 replies. It should begin with principles: make strong points, improve builders, seek advanced anchors, avoid premature inflexibility, and understand when slotting is productive versus reckless. USBGF’s current educational stack pairs principles-based opening teaching with large reply catalogs for later memorization. That sequence is correct and should be mirrored here. citeturn35view0turn35view1  

Modern bot-informed opening guidance is more skeptical of early random splots than many older players were taught. USBGF’s opening material says early-game splots are almost always wrong unless the alternatives are poor, and modern commentary explicitly notes that some widely played old-school slots have given way to major splits or more nuanced score-dependent alternatives. citeturn36search3turn36search2  

This document should therefore teach *opening logic* first: why splitting competes for anchors, why builders matter, why some deep-point plays commit you to attack, and why score alters the best “equal” choice. Later, a separate generated artifact can hold reply tables. The coach’s live answers should retrieve principles first and tables second.

**Filename:** `knowledge/endgame/bearoff-and-reference-positions.md`  
**Purpose:** endgame teaching and future reference-position hooks  
**Audience:** all  
**Estimated size:** 900–1100 words  
**Actual first-draft content:**  
Endgame teaching should distinguish among three cases: pure race, bearoff with wastage questions, and tactical endings where contact or a late shot still exists. eXtreme Gammon explicitly exposes bearoff database functionality and rollout truncation in bearoff situations, which is a reminder that bearoff play is a special analysis domain, not just “keep rolling big numbers.” citeturn13view0turn14view3  

First-draft endgame teaching should focus on wastage, distribution, crossovers, and race-roll timing. Learners should be taught why even distributions usually waste fewer pips, why clearing high points often matters, and why a technically won bearoff can still lose equity through poor checker distribution.  

This file should also reserve a section called **Reference Positions** with short canonical names rather than giant diagrams in prose. Examples: “last-roll shot race,” “one-gap bearoff,” “deep-anchor late shot,” “closed-board re-entry race.” Later versions can attach position IDs, GNU/XG rollout snapshots, and diagram assets. The important thing now is to establish the naming system.

**Filename:** `knowledge/lessons/curriculum-ladders.md`  
**Purpose:** a scaffolded learning roadmap for adaptive tutoring  
**Audience:** learners and runtime coach  
**Estimated size:** 1100–1400 words  
**Actual first-draft content:**  
**Beginner ladder:** rules, legal moves, bar entry, bearing off, basic counting, point-making, blots, anchors, race versus contact, and the four game plans (race, prime, blitz, contact). The beginner should leave with a usable first classifier: “What kind of game is this?”  

**Intermediate ladder:** opening principles, reply principles, builder logic, duplication, flexibility, holding games, backgame warnings, zone counting, cube basics, and common anti-patterns such as burying checkers and breaking structure for short-term safety.  

**Advanced ladder:** prime-vs-prime timing, score-sensitive openings, cash versus take, gammon-go/gammon-save logic, reference races, volatility language, and explaining bot disagreements without turning the lesson into bot worship.  

This structure deliberately mirrors learning-science evidence: novices benefit from explicit instruction and worked examples; practice testing and distributed practice are especially effective; interleaving and self-explanation help transfer; and support should gradually fall as expertise rises. citeturn22view1turn19view0turn19view1turn19view2turn41view0

**Filename:** `knowledge/coaching/common-mistakes-and-myths.md`  
**Purpose:** high-yield misconception correction  
**Audience:** all, especially runtime coach  
**Estimated size:** 1000–1300 words  
**Actual first-draft content:**  
Myth: “If I’m ahead in the race, every play should get safer.” Reality: race lead matters, but in contact positions board strength, anchor value, and timing can outweigh raw pip lead. citeturn27view3turn27view1  

Myth: “Backgames are awesome comeback machines.” Reality: they are expensive structures that require timing and front-position discipline; many club players build them far too often. citeturn28view0turn28view1  

Myth: “A point is always good to keep.” Reality: a point is useful only if it still blocks or still serves as a landing point. Otherwise it may become a liability that should be cleared. citeturn27view3  

Myth: “Safe is better than bold.” Reality: bold and safe are relative to anchor status, board strength, trapped-checker count, and race. Mochy’s addition of race to Magriel’s classical criteria should be treated as core modern teaching. citeturn14view4turn13view4  

Myth: “Cube action is math you do after the move.” Reality: checker play and cube action interact through volatility, gammons, and market losers. Common player improvement often comes from seeing that interaction earlier.

**Filename:** `knowledge/coaching/faq-and-analogies.md`  
**Purpose:** conversational teaching stock for multiple explanation styles  
**Audience:** runtime coach and human educators  
**Estimated size:** 900–1100 words  
**Actual first-draft content:**  
**FAQ:** “Why is slotting good here?”  
Because the blot is not random; it is an investment. You are leaving a checker where many future numbers can make a strong point, and the reward exceeds the immediate hitting risk.  

**FAQ:** “Why did I lose timing?”  
Because your position ran out of useful small moves before the strategic job was done. You needed to keep the prime or contact longer than your spare-checker supply allowed.  

**Analogy:** A prime is like a roadblock, but also like a supply line. It stops the opponent and organizes your own traffic. citeturn27view3  

**Analogy:** A holding game is not an attack; it is a loaded trap. You are not winning yet. You are keeping the trap armed until the opponent steps in range. citeturn28view3  

**Analogy:** A backgame is a trapped spring. Powerful if it stays compressed long enough; useless if it snaps in your own hands first. citeturn28view1  

This file should deliberately store beginner, intermediate, and advanced phrasing for the same concept so the coach can answer “Explain it more simply” without searching elsewhere.

**Filename:** `knowledge/coaching/example-dialogues.md`  
**Purpose:** reusable coaching patterns for long-form conversations  
**Audience:** runtime coach developers  
**Estimated size:** 900–1200 words  
**Actual first-draft content:**  
**Dialogue pattern: move explanation**  
Coach: “Before we compare moves, classify the position. This is still contact, your opponent has an advanced anchor, and your stronger board gives you attack value. That means the race lead matters less than your ability to keep attacking.”  
Learner: “So my safe move was too passive?”  
Coach: “Exactly. It protected a blot, but it reduced future attack rolls and gave up market pressure.”  

**Dialogue pattern: misconception correction**  
Learner: “I made a backgame because I was behind.”  
Coach: “Being behind can justify contact, but a backgame is not just ‘contact plus hope.’ It needs timing. Let’s check whether your front position could afford to wait.”  

**Dialogue pattern: bot disagreement**  
Coach: “GNU/XG disliked your move for a small amount. That doesn’t mean the move is foolish. It usually means one concept was slightly misweighted — often timing, gammon danger, or builder placement. Let’s identify which one.”  

These dialogues should sound like a human teacher, not a search result.

**Filename:** `knowledge/coaching/reusable-snippets.md`  
**Purpose:** short retrieval units for UI tooltips, inline commentary, and quiz feedback  
**Audience:** runtime coach and product UI  
**Estimated size:** 700–900 words  
**Actual first-draft content:**  
**Snippet: anchor value**  
“An anchor does three jobs: it keeps you alive against attacks, preserves contact for future shots, and can improve your racing route if it is advanced enough.” citeturn12search8turn28view3  

**Snippet: timing**  
“Timing is the number of useful moves you still own before you must break the structure your plan depends on.”  

**Snippet: volatile cube**  
“This cube is urgent because many next-roll sequences move from take to pass. Waiting risks losing your market.”  

**Snippet: bad safety**  
“This play is safer now but weaker later. It reduces immediate shots while also shrinking your future options.”  

**Snippet: backgame warning**  
“Do not build a backgame just because you are behind. Ask first whether your front position can survive long enough to use it.” citeturn28view1  

These snippets should be embedded aggressively because they are short, semantically tight, and highly reusable.

## Deliverable two repository documentation architecture

The repository should separate **implementation truth** from **domain/coaching knowledge**. Put software, architecture, testing, API, and contribution guidance in `docs/`. Put conceptual backgammon and pedagogy material in `knowledge/`. Keep `worklogs/` as historical journals, and promote enduring decisions out of worklogs into `docs/` or `knowledge/` as soon as they stabilize. This split matters because Diátaxis explicitly distinguishes tutorial, how-to, reference, and explanation, while ADR practice emphasizes short records of individual decisions with rationale and consequences. Your repo needs both. citeturn40search1turn18view1turn9search12turn9search16

Recommended structure:

```text
docs/
  README.md
  architecture/
    system-overview.md
    domain-model.md
    engine-architecture.md
    ui-architecture.md
    ai-architecture.md
    retrieval-architecture.md
  adr/
    ADR-0001-docs-knowledge-separation.md
    ADR-0002-position-immutability.md
    ADR-0003-engine-state-orchestration.md
    ADR-0004-knowledge-front-matter-schema.md
  reference/
    engine-api.md
    ui-component-map.md
    data-contracts.md
    testing-matrix.md
    repository-glossary.md
  guides/
    contributor-guide.md
    ai-contributor-guide.md
    testing-philosophy.md
    worklog-policy.md
    release-process.md
    roadmap-and-planning.md
  tutorials/
    first-engine-contribution.md
    first-ui-contribution.md
    adding-a-new-engine-rule.md
worklogs/
  YYYY/
    milestone-<slug>.md
knowledge/
  ...
```

Recommended document register:

| File | Purpose | Intended audience | Approx. size | Maintenance strategy | Relationships |
|---|---|---|---:|---|---|
| `docs/README.md` | navigation hub for repo docs | everyone | 400–600 words | update whenever tree changes | links to all major docs |
| `docs/architecture/system-overview.md` | one-page map of subsystems and boundaries | contributors, coding agents | 800–1200 words | manually curated after milestone changes | parent of all architecture docs |
| `docs/architecture/domain-model.md` | source of truth for game entities and invariants | engine contributors, agents | 1200–1800 words | update with model changes; reviewed in PRs touching model | links to engine API, ADRs |
| `docs/architecture/engine-architecture.md` | explain move generation, application, state orchestration | engine contributors, agents | 1200–1800 words | update when engine flow changes materially | links to testing matrix and worklogs |
| `docs/architecture/ui-architecture.md` | explain board rendering, interaction, state flow, PWA shape | UI contributors, agents | 1000–1500 words | revise when front-end patterns or state boundaries change | links to component map |
| `docs/architecture/ai-architecture.md` | explain three AI consumers and boundaries | maintainers, AI agents | 1000–1500 words | high-priority manual doc | links to knowledge and retrieval architecture |
| `docs/architecture/retrieval-architecture.md` | define chunking, metadata, embedding scope, retrieval flow | maintainers, AI infra contributors | 1000–1500 words | update when RAG stack changes | links to knowledge schema ADR |
| `docs/adr/*.md` | capture one permanent architectural decision per file | contributors, future maintainers, agents | 300–700 words each | append-only; supersede, do not rewrite | referenced by architecture docs |
| `docs/reference/engine-api.md` | stable API reference for engine modules | contributors, agents | 1200–2000 words | partially AI-drafted, code-reviewed | mirrors code layout |
| `docs/reference/ui-component-map.md` | stateful map of interactive board components | UI contributors, agents | 800–1200 words | update with component additions/removals | links to UI architecture |
| `docs/reference/data-contracts.md` | schemas for positions, moves, annotations, imports | contributors, agents | 1000–1400 words | generated where possible, reviewed manually | links to engine API and future import docs |
| `docs/reference/testing-matrix.md` | enumerate test layers and coverage expectations | contributors, agents | 800–1200 words | update with new subsystems | links to testing philosophy |
| `docs/guides/contributor-guide.md` | human contribution workflow | human contributors | 800–1200 words | stable, reviewed quarterly | links to worklog policy and release process |
| `docs/guides/ai-contributor-guide.md` | instruct coding agents on reading order, constraints, and output expectations | coding agents, maintainers | 1000–1500 words | high-priority, frequently refined | links to ingestion plan |
| `docs/guides/testing-philosophy.md` | explain what correctness means and what to test first | contributors | 900–1300 words | reviewed when failures expose ambiguity | links to testing matrix |
| `docs/guides/worklog-policy.md` | define milestone worklog format and promotion rules | maintainers | 700–900 words | stable | links to ADR and permanent docs |
| `docs/guides/release-process.md` | tag, changelog, package, release procedure | maintainers | 600–900 words | revise when CI/release changes | links to roadmap |
| `docs/guides/roadmap-and-planning.md` | durable milestone roadmap, not ephemeral notes | contributors, users, agents | 800–1200 words | quarterly updates | links to worklogs |
| `docs/tutorials/*` | on-ramp docs for first useful contribution | humans, junior agents | 700–1000 words each | update when workflows change | should point into reference docs |

What belongs where is simple. If the document explains **software reality** and must stay aligned with the code, it belongs in `docs/`. If the document explains **backgammon knowledge or pedagogy** that the runtime coach should use, it belongs in `knowledge/`. If the document narrates what happened in one milestone and may later be mined for permanent truths, it belongs in `worklogs/`. If the document records a durable decision that outlives the milestone narrative, it belongs in `docs/adr/`. That separation reduces accidental duplication and keeps retrieval clean for both coding and coaching contexts. citeturn40search5turn40search8turn18view1

## Deliverable three ingestion plan

```md
# AI Documentation Ingestion Plan

## Purpose

This document defines an incremental approach for migrating the repository to the proposed documentation architecture without pausing feature work. The goal is not a one-time rewrite. The goal is a steady promotion of already-known project knowledge into stable, AI-readable documents.

## Principles

- Prefer incremental migration over big-bang reorganization.
- Preserve existing milestone velocity.
- Promote stable knowledge out of worklogs as soon as it stops changing frequently.
- Separate implementation documentation from coaching knowledge.
- Keep documents small enough for agent retrieval and human scanning.
- Make every permanent document the source of truth for one thing.

## Migration phases

### Foundation phase

Create the top-level directories:

- `docs/`
- `docs/architecture/`
- `docs/reference/`
- `docs/guides/`
- `docs/tutorials/`
- `docs/adr/`
- `knowledge/`
- `worklogs/`

Add:

- `docs/README.md`
- `knowledge/README.md`
- `docs/guides/worklog-policy.md`
- `docs/adr/ADR-0001-docs-knowledge-separation.md`

This phase should be fast and low-risk.

### Stabilization phase

Draft the core durable documents that coding agents need first:

- `docs/architecture/system-overview.md`
- `docs/architecture/domain-model.md`
- `docs/architecture/engine-architecture.md`
- `docs/guides/ai-contributor-guide.md`
- `docs/reference/testing-matrix.md`

At the same time, create the first coaching-safe concept files in `knowledge/`:

- glossary
- position classification
- game plans
- timing and structure
- cube basics

These are the highest-leverage files for both AI retrieval and contributor onboarding.

### Promotion phase

Review existing milestone worklogs and extract durable information into permanent docs.

Worklog material that is usually safe to promote with AI drafting:
- chronology
- milestone summaries
- renamed modules
- lists of completed rule support
- already-decided directory structure
- test categories already implemented

Worklog material that usually requires author review before promotion:
- architectural rationale
- invariants
- tradeoff decisions
- rejected alternatives
- statements about intended public API
- long-term vision and non-goals

Worklog material that usually requires original author input:
- design philosophy
- product principles
- naming decisions that carry deep meaning
- roadmap priorities
- boundaries between engine, UI, and AI systems

### Coverage phase

Add the full set of reference and guide documents:

- API docs
- UI component map
- data contracts
- contributor guide
- release process
- roadmap

Then expand `knowledge/` with:
- openings
- match play
- bearoff
- mistakes and myths
- FAQ and analogies
- reusable coaching snippets
- example dialogues

### Refinement phase

Add metadata/front matter to every document.
Add cross-links and prerequisite links.
Normalize titles and stable IDs.
Add CI checks for:
- required front matter
- broken links
- oversized documents
- missing update dates
- missing related-doc links for new ADRs

## Dependency ordering

Recommended order:

1. Docs/knowledge top-level split
2. Worklog policy
3. System overview
4. Domain model
5. Engine architecture
6. AI contributor guide
7. Initial knowledge files
8. ADR backlog
9. API/reference docs
10. UI architecture and component map
11. Retrieval architecture
12. Expanded coaching corpus

Do not start with API exhaustiveness.
Do not start with visual polish.
Do not start with generated documentation pipelines.
Start with the conceptual files that unblock agents.

## AI drafting guidance

Safe for AI-first drafts:
- navigation hubs
- document skeletons
- worklog summaries
- glossary expansion from approved definitions
- cross-link insertion
- consistency cleanup
- front matter insertion
- first-pass API reference from code and tests

Needs heavy human review:
- architectural overviews
- domain invariants
- public-facing design principles
- non-goals
- long-term roadmap
- pedagogical voice for coaching documents

Must be author-led:
- product vision statements
- controversial tradeoff decisions
- project philosophy
- documents that define what “quality” means for this project

## Expected review effort

- Foundation phase: low
- Stabilization phase: moderate
- Promotion phase: moderate to high
- Coverage phase: moderate
- Refinement phase: low to moderate

The most expensive reviews are not grammatical.
They are semantic: checking whether a document overstates architectural certainty or invents rationale not actually decided.

## Risks

- duplicating worklog content without promoting a source of truth
- mixing coaching knowledge with implementation details
- creating large documents that agents retrieve poorly
- letting AI-generated rationale drift away from actual decisions
- stale architecture docs after active refactors
- inconsistent terminology between engine docs and coach knowledge

## Validation strategy

A migration phase is complete only if all of the following are true:

- a new contributor can find the engine overview quickly
- a coding agent can identify the domain model and the current engine boundaries
- a runtime coaching agent can answer basic conceptual questions from `knowledge/`
- at least one worklog fact has been promoted into a permanent doc
- every new permanent doc names its source of truth and related docs
- no document exceeds the agreed size target without justification

## Ongoing policy

After every milestone:
1. write the worklog
2. identify durable decisions
3. create or update ADRs
4. update permanent docs
5. update knowledge docs only when a concept, misconception, or teaching pattern has materially changed

This keeps the repository learnable by humans, coding agents, and future coaches at the same time.
```

This migration plan is optimized for the repo you described: milestone-driven, worklog-heavy, and likely to accumulate knowledge faster than it accumulates polished documentation. It also reflects the documentation split recommended by Diátaxis and ADR practice while staying incremental enough for an active open-source codebase. citeturn40search1turn18view1turn9search16

## Retrieval and coaching architecture

For retrieval, the best long-term design is a **three-layer corpus**. Layer one is source-of-truth docs in `docs/` and `knowledge/`. Layer two is retrieval-optimized chunks derived from those files. Layer three is optional generated artifacts like diagrams, tables, quiz cards, and embeddings. The important discipline is that only layer one is canonical. Embeddings, indexes, graph nodes, and chunk JSON should be rebuildable artifacts, never the source of truth. That principle follows directly from both good docs practice and modern retrieval systems. citeturn18view5turn38view2turn18view6

Recommended chunking and embedding policy:

- Embed `knowledge/*.md` aggressively, because these are the runtime coach’s main conceptual sources.
- Embed concise architecture and reference docs that coding agents need, especially `system-overview`, `domain-model`, `engine-architecture`, `ui-architecture`, `ai-architecture`, and `testing-matrix`.
- Do **not** embed milestone worklogs by default. Worklogs are noisy, temporally unstable, and retrieve poorly unless filtered very tightly.
- Do **not** embed generated site navigation pages, changelog fragments, or duplicated export formats.
- Chunk by semantic section, not fixed pages.
- Prefer chunk sizes in the rough range of 250–700 tokens for concept docs, with slightly larger chunks for compact reference sections and smaller chunks for FAQs/snippets.
- Prepend a 40–100 token contextual summary to each chunk at indexing time, using the document title, section title, audience, and one-sentence purpose. Anthropic’s contextual-retrieval results are directly relevant here. citeturn18view4turn18view5

Recommended front matter fields:

```yaml
id: kg.priming
title: Priming
doc_type: concept
audience: [learner, runtime-coach]
difficulty: intermediate
topics: [prime, checker-play, timing, structure]
prerequisites: [kg.position-classification, kg.anchors-builders]
related: [kg.blitz-holding-back-games, kg.timing-structure-volatility]
canonical_questions:
  - What is a prime?
  - Why is this a priming game?
  - Why am I losing timing in prime-vs-prime?
source_strategy: canonical
updated_from: milestone-2026-07
```

That metadata is useful in at least four ways. It supports later metadata filtering; it supports chunk contextualization; it allows graph edges such as prerequisite and related-concept links; and it gives the runtime coach a cleaner way to choose “beginner” versus “advanced” explanations. OpenAI’s current hosted retrieval supports metadata filtering, and hybrid semantic-plus-keyword retrieval is now a standard pattern precisely because user queries mix conceptual intent with exact vocabulary. citeturn38view3turn18view7turn38view1

For the runtime coach specifically, organize retrieval around **question shapes**, not only topics. Each concept file should include direct factual content, “why” explanations, misconception notes, comparison hooks, and at least one hypothetical pattern. For example, `priming.md` should not only define a prime. It should also answer: “Why did my prime fail?”, “When is being behind in the race good?”, “What is a stronger structure?”, and “How is this unlike a holding game?” That structure matters because long coaching conversations constantly shift between definition, diagnosis, comparison, and application. GraphRAG-style entity maps may eventually help multi-hop comparison questions, but the first major gain will come earlier from clean metadata, cross-links, and chunk-aware retrieval. citeturn18view6turn10search12

For coding agents with limited context windows, prefer document sizes that answer one question well instead of five questions vaguely. A strong practical target is roughly 600–1600 words for permanent docs, with larger docs split when they begin to mix concepts, workflows, and rationale. Diátaxis is helpful here because it prevents reference from bloating into explanation and tutorials from bloating into design essays. For agents, naming conventions should be literal, not clever: `engine-architecture.md`, not `the-engine-room.md`; `timing-structure-and-volatility.md`, not `why-things-fall-apart.md`. Reference documents should be particularly austere, because Diátaxis is right that reference is consulted, not read end-to-end. citeturn40search5turn40search7turn40search4

Promotion policy from worklogs into permanence should be explicit:

- Promote to `docs/adr/` when the worklog explains **why** a stable decision was made.
- Promote to `docs/architecture/` when the worklog explains **how the system now works** and that knowledge should outlive the milestone.
- Promote to `knowledge/` when the worklog or study session uncovers a stable teaching concept, misconception, or coaching pattern.
- Leave in `worklogs/` when the content is mainly chronology, exploratory alternatives, or milestone progress notes.

This preserves both human discoverability and retrieval precision. Coding agents need current architecture with rationale, not diary prose. Coaching agents need curated strategy knowledge, not implementation history.

## Tradeoffs and long-term scaling

The most important tradeoff in this project is between **human readability** and **AI retrieval granularity**. For a conventional open-source repo, one elegant long handbook might be acceptable. For your use case, it is not. Runtime coaching agents will benefit much more from a web of small canonical docs connected by stable IDs, prerequisite links, reusable snippets, and example dialogues. That will feel slightly more fragmented to humans, but the fragmentation is productive because it mirrors the way learners actually ask questions in conversation. Anthropic’s contextual retrieval work, OpenAI’s metadata-aware file search, and the general move toward hybrid retrieval all point in the same direction: smaller coherent units, better labels, better reranking, less accidental noise. citeturn18view4turn38view1turn38view3turn39view0

A second tradeoff is between **encyclopedic completeness** and **pedagogical usefulness**. The finished platform may eventually need opening explorers, rollout visualizers, import/export pipelines, player profiles, personalized curricula, and neural evaluation. But the first durable knowledge architecture should not try to model every future feature today. It should instead define a clean spine that can absorb them later: stable document IDs, concept files, reference-position IDs, lesson ladders, mistake categories, and a docs/knowledge split. That is the part that scales cleanly across many years.  

A third tradeoff is between **bot authority** and **human-teacher voice**. Players do not want a coach that merely says “XG says so.” They want a coach that can classify the position, explain the game plan, identify the missed concept, answer follow-up questions at different difficulty levels, and assign practice. The learning-science evidence strongly favors that style: explicit teaching for novices, worked examples, retrieval practice, distributed review, self-explanation prompts, and adaptive next-task selection. In other words, the platform should not imitate a bot interface. It should stand on bot-quality analysis while behaving like a patient expert teacher. citeturn22view1turn19view0turn19view1turn41view0turn22view4turn22view3

If you optimize for the eight goals you listed, the architecture above gives the best long-run balance. `docs/` becomes the durable map for contributors and coding agents. `knowledge/` becomes the curated conceptual corpus for conversational coaching. `worklogs/` remain the rich historical input stream. ADRs preserve the “why.” Retrieval uses small canonical docs, metadata, hybrid search, and reranking. Education uses progressive disclosure, deliberate practice, misconceptions, and adaptive sequencing. Backgammon content stays bot-informed without becoming bot-dependent. That combination is the most credible path to a long-lived open-source backgammon platform that is truly AI-native rather than merely AI-adjacent. citeturn40search1turn18view1turn18view7turn39view0turn18view12turn24view0turn25view1