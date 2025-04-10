import { GITHUB_LINK, metadataForPage } from "../metadata";

import "./style.css";

export const metadata = metadataForPage("About");

/** About page. */
export default function Page() {
  return (
    <div className="d-flex flex-column gap-3">
      <div>
        <div className="h3">What?</div>
        <div>This is a formatter for Google Sheets formulas.</div>
      </div>

      <div>
        <div className="h4">Features</div>
        <ul>
          <li>Some syntax highlighting, such as for strings and literals</li>
          <li>
            Invalid formula syntax detection (may not be fully compatible with
            Google Sheets)
          </li>
          <li>
            Basic formatting triggered by one of the following keyboard
            shortcuts:
            <ul>
              <li>
                <code>ctrl/cmd + S</code>
              </li>
              <li>
                <code>alt/opt + shift + F</code>
              </li>
              <li>
                <code>ctrl/cmd + alt/opt + L</code>
              </li>
            </ul>
          </li>
          <li>Configurable tab size and line width limit</li>
        </ul>
      </div>

      <div>
        <div className="h3">Why?</div>
        <div>
          I write a lot of formulas in Google Sheets. Sometimes they get so long
          and complicated that formatting becomes a real problem. So I made this
          to help with that, but the feature set is a little lacking so
          it&apos;s honestly not that useful in real situations. But it&apos;s
          cool.
        </div>
      </div>

      <div className="div-spacing">
        <div className="h3">How?</div>
        <div>It&apos;s complicated...</div>
        <div>
          The input is a basic <code>textarea</code> element, but the text is
          transparent. We add an overlay of <code>div</code> elements that
          displays each line of the input, so that styling can be added to the
          text (which isn&apos;t possible inside the <code>textarea</code>. The
          leading equals sign that defines the formula is inserted in this
          overlay, not in the actual text.
        </div>
        <div>
          The overlay is built using a CSS grid layout, so that long lines that
          wrap will properly cause the line numbers to shift down, similar to
          actual code editors.
        </div>
        <div>
          After every change to the input, the text is parsed into tokens, such
          as strings, identifiers, ranges, or literals. These tokens are sent
          through a parser that provides additional syntax semantics, such as
          unclosed parentheses or unexpected tokens.
        </div>
        <div>
          Formatting follows an algorithm described in the paper{" "}
          <a
            href="https://homepages.inf.ed.ac.uk/wadler/papers/prettier/prettier.pdf"
            target="_blank"
          >
            &quot;A prettier printer&quot; by Philip Wadler
          </a>
          . This algorithm is also used by the popular opinionated formatter{" "}
          <a href="https://prettier.io/" target="_blank">
            Prettier
          </a>
          , though this project comes nothing close to the power and scope of
          Prettier. The actual implementation followed{" "}
          <a
            href="https://yorickpeterse.com/articles/how-to-write-a-code-formatter/"
            target="_blank"
          >
            this article
          </a>
          .
        </div>
      </div>

      <div>
        <div className="h3">More?</div>
        <div>
          There could be more plans for this project, most notably linting
          features. Some ideas I had were highlighting bracket pairs, a bit of
          &quot;known formula&quot; hints (e.g., wrong number of arguments,
          capitalize known formula names, etc.), and smarter formatting (e.g.,
          grouping pairs of arguments on the same line, collapsing closing
          parentheses, etc.). If you have any ideas, feel free to{" "}
          <a href={GITHUB_LINK + "/issues"} target="_blank">
            open an issue on the Github repo
          </a>
          .
        </div>
      </div>
    </div>
  );
}
