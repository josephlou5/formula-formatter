import { ChangeEvent } from "react";

export interface UserPreferences {
  /** The number of spaces in an indent. */
  tabSpaces: number;
  /** The max width of a line. */
  lineWidth: number;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  tabSpaces: 2,
  lineWidth: 80,
};

export const PREFERENCES_PANE_ID = "preferences-pane";

export function PreferencesPane({
  userPreferences,
  setUserPreferences,
}: {
  userPreferences: UserPreferences;
  setUserPreferences: (p: UserPreferences) => void;
}) {
  const { tabSpaces, lineWidth } = userPreferences;

  function handleNumberInputChange(
    defaultVal: number,
    setter: (x: number) => void
  ) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setter(getInts(event.currentTarget.value, defaultVal));
    };
  }

  const handleTabSpacesChange = handleNumberInputChange(2, (tabSpaces) =>
    setUserPreferences({ ...userPreferences, tabSpaces })
  );
  const handleLineWidthChange = handleNumberInputChange(80, (lineWidth) =>
    setUserPreferences({ ...userPreferences, lineWidth })
  );
  function handleLineWidthDelta(delta: number) {
    setUserPreferences({ ...userPreferences, lineWidth: lineWidth + delta });
  }

  function handleResetDefaults() {
    setUserPreferences({ ...DEFAULT_USER_PREFERENCES });
  }

  const labelId = `${PREFERENCES_PANE_ID}-label`;
  const tabSpacesInputId = "tab-spaces-input";
  const tabSpacesDescId = `${tabSpacesInputId}-desc`;
  const lineWidthInputId = "line-width-input";
  const lineWidthDescId = `${lineWidthInputId}-desc`;
  return (
    <div
      id={PREFERENCES_PANE_ID}
      className="offcanvas offcanvas-end"
      data-bs-backdrop="false"
      data-bs-scroll="true"
      tabIndex={-1}
      aria-labelledby={labelId}
    >
      <div className="offcanvas-header">
        <h5 id={labelId} className="offcanvas-title">
          Preferences
        </h5>
        <button
          type="button"
          className="btn-close"
          data-bs-dismiss="offcanvas"
          aria-label="Close"
        ></button>
      </div>
      <div className="offcanvas-body">
        <div className="mb-3">
          <label htmlFor={tabSpacesInputId} className="form-label">
            Tab Spaces: {tabSpaces}
          </label>
          <div className="d-flex gap-3">
            1
            <input
              id={tabSpacesInputId}
              type="range"
              className="form-range"
              value={tabSpaces}
              min="1"
              max="8"
              step="1"
              aria-describedby={tabSpacesDescId}
              onChange={handleTabSpacesChange}
            />
            8
          </div>
          <div id={tabSpacesDescId} className="form-text">
            The number of spaces in an indent.
          </div>
        </div>
        <div className="mb-3">
          <label htmlFor={lineWidthInputId} className="form-label">
            Line Width
          </label>
          <div className="input-group">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => handleLineWidthDelta(-1)}
            >
              <i className="bi bi-dash-lg"></i>
            </button>
            <input
              id={lineWidthInputId}
              type="text"
              className="form-control"
              value={lineWidth}
              inputMode="numeric"
              pattern="[0-9]"
              aria-describedby={lineWidthDescId}
              onChange={handleLineWidthChange}
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => handleLineWidthDelta(1)}
            >
              <i className="bi bi-plus-lg"></i>
            </button>
          </div>
          <div id={lineWidthDescId} className="form-text">
            The max width of a line.
          </div>
        </div>
        <div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleResetDefaults}
          >
            Reset defaults
          </button>
        </div>
      </div>
    </div>
  );
}

/** Returns all the integers in the string as a number. */
function getInts(str: string, defaultValue = 0): number {
  let sawDigit = false;
  let num = 0;
  for (const char of str) {
    const digit = parseInt(char);
    if (isNaN(digit)) continue;
    sawDigit = true;
    num = num * 10 + digit;
  }
  if (!sawDigit) return defaultValue;
  return num;
}
