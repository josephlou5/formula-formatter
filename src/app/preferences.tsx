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
      const num = !Number.isNaN(event.currentTarget.valueAsNumber)
        ? event.currentTarget.valueAsNumber
        : defaultVal;
      setter(num);
    };
  }

  const handleTabSpacesChange = handleNumberInputChange(2, (tabSpaces) =>
    setUserPreferences({ ...userPreferences, tabSpaces })
  );
  const handleLineWidthChange = handleNumberInputChange(80, (lineWidth) =>
    setUserPreferences({ ...userPreferences, lineWidth })
  );

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
            Tab Spaces
          </label>
          <input
            type="number"
            id={tabSpacesInputId}
            className="form-control"
            value={tabSpaces}
            min="1"
            max="8"
            step="1"
            aria-describedby={tabSpacesDescId}
            onChange={handleTabSpacesChange}
          />
          <div id={tabSpacesDescId} className="form-text">
            The number of spaces in an indent.
          </div>
        </div>
        <div className="mb-3">
          <label htmlFor={lineWidthInputId} className="form-label">
            Line Width
          </label>
          <input
            type="number"
            id={lineWidthInputId}
            className="form-control"
            value={lineWidth}
            min="10"
            step="1"
            aria-describedby={lineWidthDescId}
            onChange={handleLineWidthChange}
          />
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
