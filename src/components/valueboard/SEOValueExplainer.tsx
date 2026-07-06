import { BoardSection } from './BoardSection';
/**
 * SEOValueExplainer — the long-form, honest explanation of how the Value Board
 * works, written for both readers and search engines. Sits beneath the
 * interactive board. Static by design (structure and copy are fixed; only the
 * board above is dynamic).
 */
export function SEOValueExplainer() {
  const h2 = 'mt-8 font-display text-xl uppercase tracking-tight text-[#f8e7a1] md:text-2xl';
  const p = 'mt-3 text-[13.5px] leading-relaxed text-white/65';
  return (
    <BoardSection tone="cyan">
      <article className="mx-auto max-w-3xl p-5 md:p-9">
        <h2 className="font-display text-2xl uppercase tracking-tight text-white md:text-3xl">
          How Our Football Value Board Works
        </h2>
        <p className={p}>
          Every morning, the Footy Oracle engine rebuilds its form tables from the last eight matches of every team on
          today's card — goals, corners, cards and both-teams-to-score, across every league we cover. The Value Board
          is the reading of those tables. For each fixture and each exact market line, we calculate a model
          probability from the recent form, convert the bookmaker's price into an implied probability, and measure the
          gap between the two. When the form says an outcome lands more often than the price is paying for, that gap
          is a <strong>football value bet</strong> — and it goes on the board.
        </p>
        <p className={p}>
          That's the whole method, and it's deliberately simple: no black boxes, no "secret algorithms", no tipster
          hunches dressed up as science. The numbers are shown next to every fixture — model probability, implied
          probability, the gap in percentage points, and the odds snapshot we measured against — so you can check our
          working on every single row. If a market has no strong edge today, the board says so plainly.
        </p>

        <h2 className={h2}>Value Bets Over 2.5 Goals</h2>
        <p className={p}>
          The over 2.5 goals market is the most-traded line in football, which makes it efficient — but not perfect.
          Bookmakers price reputations and league averages; our form tables price the last eight games of the two
          teams actually playing. When two leaky defences meet two in-form attacks and the price still implies a
          coin flip, the board flags it. Value bets over 2.5 goals appear on the Goals tab whenever that gap clears
          our bar, ranked biggest gap first.
        </p>

        <h2 className={h2}>Under 2.5 Goals Value Bets</h2>
        <p className={p}>
          Unders are where casual money rarely looks, and that neglect creates price errors. When both teams have
          been grinding out low-scoring games — solid defensive shape, few chances conceded, strikers out of form —
          the under 2.5 goals price can lag well behind the pattern. The board treats unders as first-class markets:
          the model probability for an under is read from the same form tables, and under 2.5 goals value bets are
          ranked with exactly the same honesty as the overs.
        </p>

        <h2 className={h2}>Over 3.5 and 4.5 Goals Markets</h2>
        <p className={p}>
          The higher goal lines — over 3.5 goals and over 4.5 goals — are lower-probability, higher-price plays, and
          they demand more evidence before we'll call them value. A team involved in one 5–1 freak result doesn't
          qualify; a pair of teams whose combined matches have cleared the line week after week might. The board
          shows the recent hit rate for the exact line so you can see how often it has actually landed, not just how
          exciting the price looks.
        </p>

        <h2 className={h2}>Corners Value Markets: Over and Under 8.5, 9.5, 10.5 and 11.5</h2>
        <p className={p}>
          Corner markets are priced with less care than goals — there's simply less money in them, so the prices move
          slower and the errors last longer. Our tables track total corners per game for every team's last eight,
          which makes the pattern easy to read: wide, crossing teams stack corners; narrow, patient teams starve
          them. The board covers over and under lines at 8.5, 9.5, 10.5 and 11.5 corners, and it's regularly where
          the biggest value gaps on the whole card show up. If you only ever look at one unfashionable market, make
          it over 9.5 corners value bets — the sharpest edges love a quiet room.
        </p>

        <h2 className={h2}>Cards Value Markets: Over and Under 3.5, 4.5 and 5.5</h2>
        <p className={p}>
          Cards follow fixtures, not form alone: derbies, relegation scraps and teams that foul to break up play all
          push booking counts up. Our tables track total match cards across each team's recent games, and the board
          prices over and under lines at 3.5, 4.5 and 5.5 cards. One honest caveat, shown on the board itself: not
          every league we cover has bookmaker card prices every day. When there's no price, the market shows as
          unpriced rather than invented — we never fabricate a line to fill a box.
        </p>

        <h2 className={h2}>Both Teams To Score Value Picks</h2>
        <p className={p}>
          Both teams to score is the cleanest expression of a simple question: do both of these teams usually find
          the net, and do both usually concede? Our BTTS percentage comes straight from the recent-form tables, and
          the board compares it against both the yes and the no price. Both teams to score value picks tend to
          cluster around the same profile — two open teams with soft centres — and the fixture breakdown shows you
          the scoring and conceding pattern behind every flag.
        </p>

        <h2 className={h2}>Why The Gaffer Does Not Force Picks</h2>
        <p className={p}>
          Some days the board is busy; some days it's nearly empty. That's not a bug — it's the entire point. Value
          exists only when the market has made a mistake, and the market doesn't make mistakes to order. A tipster
          who posts the same number of picks every day regardless of the card is telling you about his content
          schedule, not about football. The Gaffer's rule is fixed: when nothing clears the bar, the board says
          "quiet day" and his card says no bet. A skipped losing bet pays exactly the same as a winner you never
          had — nothing — and costs you nothing to take.
        </p>

        <h2 className={h2}>Paid Email Alerts for Football Value Bets</h2>
        <p className={p}>
          Members don't need to keep checking the board — the board comes to them. Alert preferences let you choose
          the Gaffer's daily card only, every value alert, or just the specific markets you personally play: goals
          lines, corners lines, cards lines or BTTS, each at your exact line. Timing is yours too — the morning scan
          when the board is rebuilt, a pre-kickoff reminder, or a ping when new value appears during the day. And if
          you want the honest version of quiet, turn on the quiet-day callback: an email that says "nothing today"
          is worth more than a forced pick ever will be.
        </p>

        <h2 className={h2}>What Paid Members Get</h2>
        <p className={p}>
          The full board, every market family, every exact line, the ranked fixture tables, the per-fixture
          breakdowns with recent form and head-to-head, the Gaffer's daily double and treble with his reasoning, and
          the email alerts — all refreshed every morning from data-led football form tables, all shown with the
          numbers attached, all logged win or lose on the public record. Disciplined football insight, not a hype
          machine: we show our working, we show our losses, and we let the edges do the talking over a season.
        </p>
      </article>
    </BoardSection>
  );
}

/** ResponsibleFooterNote — the small print, said plainly. */
export function ResponsibleFooterNote() {
  return (
    <p className="mx-auto max-w-2xl px-4 text-center text-[11px] leading-relaxed text-white/35">
      The Value Board measures gaps between recent-form probability and market pricing. It deals in edges, never
      certainties — no outcome is guaranteed, and losing runs happen to every honest record. Bet only what you can
      comfortably afford, treat every pick as a lean rather than a lock, and take a break if it stops being fun.
      18+. Please gamble responsibly.
    </p>
  );
}
