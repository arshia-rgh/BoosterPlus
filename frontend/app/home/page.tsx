import CharacterShowcase, { CharacterArt } from "./characters";
import { defaultHome } from "../site/content";
import type { HomeContent } from "../site/model";
import { Link } from "react-router";
import { Avatar, Emblem } from "./emblem";
import {
  setMotionPreference,
  useMotionPreference,
  useRankScene,
  useSectionReveals,
} from "./motion";
import "./home.css";

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}
function RankProfile({
  elevated = false,
  content,
}: {
  elevated?: boolean;
  content: HomeContent;
}) {
  return (
    <div className={`rank-profile ${elevated ? "rank-finish" : "rank-start"}`}>
      <div className="profile-top">
        <span>MLBB / PLAYER PROFILE</span>
        <span>◈</span>
      </div>
      <div className="profile-identity">
        <Avatar />
        <div>
          <strong>YOUR NEXT CHAPTER</strong>
          <span>Same player. New possibilities.</span>
        </div>
        <span className="profile-level">P+</span>
      </div>
      <div className="profile-emblem">
        <Emblem elevated={elevated} />
      </div>
      <div className="rank-label">
        <p className="rank-caption">
          {elevated ? "THE DESTINATION" : "THE STARTING POINT"}
        </p>
        <h3>{elevated ? content.end_rank : content.start_rank}</h3>
        <div className="rank-stars">{elevated ? "✦ ✦ ✦ ✦ ✦" : "✦ · ·"}</div>
      </div>
      <div className="profile-bottom">
        <span>YOUR RANK JOURNEY</span>
        <strong>Your next chapter ↗</strong>
      </div>
    </div>
  );
}
function RankJourney({
  enabled,
  content,
}: {
  enabled: boolean;
  content: HomeContent;
}) {
  const scene = useRankScene(enabled);
  return (
    <section
      id="rank-journey"
      ref={scene}
      className="rank-journey"
      aria-labelledby="journey-title"
    >
      <div className="journey-sticky">
        <div className="journey-copy">
          <p className="home-kicker">
            <span>01 / THE ASCENT</span>
          </p>
          <h2 id="journey-title">
            Same player.
            <br />
            <em>Different league.</em>
          </h2>
          <p>{content.scene_description}</p>
          <div className="rank-path">
            <span>{content.start_rank.toUpperCase()}</span>
            <span aria-hidden="true">⟶</span>
            <span>{content.end_rank.toUpperCase()}</span>
          </div>
          <div className="journey-track" aria-hidden="true">
            <div className="journey-fill" />
          </div>
          <p className="scene-scroll">
            <span aria-hidden="true">↓</span> Scroll to see the transformation
          </p>
          <p className="scene-static">
            Your starting point. Your next destination.
          </p>
          <Link className="home-text-link" to="/games">
            Find your boost <Arrow />
          </Link>
          <p className="scene-disclaimer">
            Illustrative profile and original rank-inspired artwork. This scene
            is not a result or win-rate guarantee.
          </p>
        </div>
        <div className="rank-visual" aria-hidden="true">
          <div className="rank-orbit" />
          <div className="rank-character">
            <CharacterArt character="iori" enabled={enabled} />
          </div>
          <div className="profile-stage">
            <RankProfile content={content} />
            <RankProfile elevated content={content} />
            <div className="rank-shimmer" />
            <svg
              className="rank-sparks"
              viewBox="0 0 430 480"
              fill="currentColor"
            >
              <circle cx="55" cy="120" r="2" />
              <circle cx="345" cy="75" r="2" />
              <circle cx="80" cy="325" r="2" />
              <circle cx="375" cy="290" r="3" />
              <circle cx="155" cy="65" r="1.5" />
              <circle cx="295" cy="375" r="1.5" />
              <path d="m55 210 3 8 8 3-8 3-3 8-3-8-8-3 8-3Zm270-95 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
export function HomePage({
  loaderData = defaultHome,
}: { loaderData?: HomeContent } = {}) {
  const content = loaderData;
  const preference = useMotionPreference();
  const enabled = preference === "system-full";
  const root = useSectionReveals(enabled);
  return (
    <main
      ref={root}
      id="main"
      className="plus-home"
      data-motion={enabled ? "full" : "reduced"}
    >
      <section className="ascend-hero" aria-labelledby="hero-title">
        {content.artwork === "ascension" && (
          <picture className="hero-art">
            <source
              media="(max-width: 700px)"
              srcSet="/artwork/ascension-768.jpg"
            />
            <img
              src="/artwork/ascension-1536.jpg"
              width="1536"
              height="1024"
              alt=""
              fetchPriority="high"
            />
          </picture>
        )}
        <div className="hero-veil" aria-hidden="true" />
        <div className="hero-grain" aria-hidden="true" />
        <div className="hero-content">
          <p className="home-kicker">
            <span className="live-dot" /> BUILT FOR YOUR NEXT CHAPTER
          </p>
          <h1 id="hero-title">
            {content.headline}
            <br />
            <em>{content.accent}</em>
          </h1>
          <p className="hero-description">{content.description}</p>
          <div className="hero-actions">
            <Link className="home-button" to="/games">
              Explore games <Arrow />
            </Link>
            {content.show_scene && (
              <a className="home-text-link" href="#rank-journey">
                See the ascent <span aria-hidden="true">↓</span>
              </a>
            )}
          </div>
          <p className="home-preview">
            <span /> {content.notice}
          </p>
        </div>
        {content.artwork === "ascension" && (
          <CharacterArt character="iori" enabled={enabled} hero />
        )}
        <div className="hero-coordinate" aria-hidden="true">
          MLBB
          <br />
          <span>01 — ASCEND</span>
        </div>
        <div className="hero-bottom">
          <span>MOBILE LEGENDS: BANG BANG</span>
          <span>YOUR GAME. YOUR GOALS.</span>
          <a
            href={content.show_scene ? "#rank-journey" : "#faq-title"}
            aria-label="Scroll to more information"
          >
            SCROLL TO EXPLORE <span aria-hidden="true">↓</span>
          </a>
        </div>
      </section>
      <div className="promise-strip" aria-label="How PLAYORA works">
        <span>
          <b>◈</b> Your choice of play mode
        </span>
        <span>
          <b>◇</b> Clear scope before payment
        </span>
        <span>
          <b>↗</b> Progress in one place
        </span>
        <span>
          <b>◎</b> A direct line to your team
        </span>
      </div>
      <div className="motion-row">
        <span>AN EXPERIENCE THAT MOVES WITH YOU</span>
        <div role="group" aria-label="Motion preference">
          <span>Motion</span>
          <button
            type="button"
            aria-pressed={preference !== "reduced"}
            onClick={() => {
              setMotionPreference(false);
            }}
          >
            System
          </button>
          <button
            type="button"
            aria-pressed={preference === "reduced"}
            onClick={() => {
              setMotionPreference(true);
            }}
          >
            Reduced
          </button>
        </div>
      </div>
      {content.show_scene && (
        <RankJourney enabled={enabled} content={content} />
      )}
      {content.show_pathways && (
        <section className="home-section pathways" aria-labelledby="path-title">
          <div className="section-heading">
            <div>
              <p className="home-kicker">02 / YOUR WAY TO PLAY</p>
              <h2 id="path-title">
                A better climb.
                <br />
                <em>On your terms.</em>
              </h2>
            </div>
            <p>
              One game. Different goals.
              <br />
              Choose the route that fits you.
            </p>
          </div>
          <div className="pathway-grid">
            <article className="pathway-card custom-path">
              <span className="card-index">01 / MADE FOR YOU</span>
              <div className="pathway-art" aria-hidden="true">
                <div className="mini-rank">
                  W<span>⟶</span>M
                </div>
                <div className="option-tags">
                  <span>Your rank</span>
                  <span>Your role</span>
                  <span>Your hero</span>
                </div>
              </div>
              <h3>Your climb, customized.</h3>
              <p>
                Set your target rank, play mode and preferences. Get an
                estimate, then review your final quote with the team.
              </p>
              <Link className="home-text-link" to="/games">
                Explore custom boosting <Arrow />
              </Link>
            </article>
            <article className="pathway-card package-path">
              <span className="card-index">02 / A CLEAR GAME PLAN</span>
              <div className="pathway-art package-symbol" aria-hidden="true">
                <Emblem elevated />
              </div>
              <h3>One pack. A clear plan.</h3>
              <p>
                Browse published packages with a defined scope and price. No
                separate admin quote before checkout.
              </p>
              <Link className="home-text-link" to="/games">
                Browse published packages <Arrow />
              </Link>
            </article>
          </div>
        </section>
      )}
      {content.show_steps && (
        <section
          className="home-section how-section"
          id="how-it-works"
          aria-labelledby="how-title"
        >
          <div className="section-heading">
            <div>
              <p className="home-kicker">03 / FROM FIRST CLICK TO FINAL GG</p>
              <h2 id="how-title">
                The climb, <em>simplified.</em>
              </h2>
            </div>
            <Link className="home-text-link" to="/support">
              Talk to the team <Arrow />
            </Link>
          </div>
          <ol className="steps-grid">
            <li>
              <span>01</span>
              <h3>Tell us your goal.</h3>
              <p>
                Choose a game, a target and how you want to play. Your
                preferences shape the plan.
              </p>
            </li>
            <li>
              <span>02</span>
              <h3>Make it official.</h3>
              <p>
                Review your custom quote or fixed package, accept its terms and
                complete the available checkout before fulfillment.
              </p>
            </li>
            <li>
              <span>03</span>
              <h3>Stay in the loop.</h3>
              <p>
                Chat with the team, follow your timeline and see the proof—all
                in your account.
              </p>
            </li>
          </ol>
        </section>
      )}
      <section
        className="home-section control-section"
        aria-labelledby="control-title"
      >
        <div className="control-copy">
          <p className="home-kicker">04 / NO GUESSING GAMES</p>
          <h2 id="control-title">
            Your journey.
            <br />
            <em>In full view.</em>
          </h2>
          <p>
            Your rank is personal. Your experience should be too. Keep your
            agreed scope, conversations and progress together, from the first
            question to the final update.
          </p>
          <Link className="home-text-link" to="/account">
            Meet your account <Arrow />
          </Link>
        </div>
        <div className="journey-preview">
          <div className="preview-top">
            <span>THE PLAYER EXPERIENCE</span>
            <span>↗</span>
          </div>
          <div className="preview-row">
            <span className="preview-icon">◇</span>
            <div>
              <h3>A clear agreement</h3>
              <p>Your scope and price, before payment.</p>
            </div>
          </div>
          <div className="preview-row">
            <span className="preview-icon">◎</span>
            <div>
              <h3>A real conversation</h3>
              <p>A private space for you and the team.</p>
            </div>
          </div>
          <div className="preview-row">
            <span className="preview-icon">↗</span>
            <div>
              <h3>Every update together</h3>
              <p>Status, scheduling and shared proof.</p>
            </div>
          </div>
          <p className="preview-note">
            Designed around your order. No public player data.
          </p>
        </div>
      </section>
      <section className="home-section faq-section" aria-labelledby="faq-title">
        <div>
          <p className="home-kicker">05 / BEFORE YOU QUEUE</p>
          <h2 id="faq-title">
            Good questions.
            <br />
            <em>Clear answers.</em>
          </h2>
          <Link className="home-text-link" to="/support">
            Ask us anything <Arrow />
          </Link>
        </div>
        <div className="faq-list">
          {content.faqs.map(({ question, answer }) => (
            <details key={question}>
              <summary>
                {question}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
      {content.featured.length > 0 && (
        <section className="home-section" aria-label="Featured offerings">
          <h2>Featured offerings</h2>
          <div className="pathway-grid">
            {content.featured.map((item) => (
              <Link className="home-text-link" key={item.href} to={item.href}>
                {item.label} ↗
              </Link>
            ))}
          </div>
        </section>
      )}
      {(content.contact_email || content.support_hours) && (
        <section className="home-section" aria-label="Contact and support">
          <h2>Talk to the team</h2>
          <p>{content.support_hours}</p>
          {content.contact_email && (
            <a
              className="home-text-link"
              href={"mailto:" + content.contact_email}
            >
              {content.contact_email}
            </a>
          )}
        </section>
      )}
      <CharacterShowcase enabled={enabled} />
      <section className="final-ascent" aria-labelledby="final-title">
        <p className="home-kicker">THE NEXT CHAPTER IS YOURS</p>
        <h2 id="final-title">
          Go beyond
          <br />
          <em>your current rank.</em>
        </h2>
        <Link className="home-button" to="/games">
          Find your next level <Arrow />
        </Link>
        <p>Starting with Mobile Legends. Built for more.</p>
      </section>
      <div className="home-fineprint">
        <span>
          Independent service. Not affiliated with or endorsed by MOONTON.
        </span>
        <span>Original illustrative artwork · Launch preview</span>
      </div>
    </main>
  );
}
