import I18n from "I18n";
import Component from "@ember/component";
import { action } from "@ember/object";
import { htmlSafe } from "@ember/template";
import discourseComputed from "discourse-common/utils/decorators";
import { getColors } from "../lib/chart-colors";

export default Component.extend({
  // Arguments:
  option: null,
  index: null,
  totalVotes: null,
  optionsCount: null,
  displayMode: null,
  highlightedOption: null,
  onMouseOver: null,
  onMouseOut: null,

  tagName: "",

  @discourseComputed("highlightedOption", "index")
  highlighted(highlightedOption, index) {
    return highlightedOption === index;
  },

  @discourseComputed("displayMode")
  showPercentage(displayMode) {
    return displayMode === "percentage";
  },

  @discourseComputed("option.votes", "totalVotes")
  percent(votes, total) {
    return I18n.toNumber((votes / total) * 100.0, { precision: 1 });
  },

  @discourseComputed("optionsCount")
  optionColors(optionsCount) {
    return getColors(optionsCount);
  },

  @discourseComputed("highlighted")
  colorBackgroundStyle(highlighted) {
    if (highlighted) {
      // TODO: Use CSS variables (#10341)
      return htmlSafe("background: rgba(0, 0, 0, 0.1);");
    }
  },

  @discourseComputed("highlighted", "optionColors", "index")
  colorPreviewStyle(highlighted, optionColors, index) {
    const color = highlighted
      ? window.Chart.helpers.getHoverColor(optionColors[index])
      : optionColors[index];

    return htmlSafe(`background: ${color};`);
  },

  @action
  onHover(active) {
    if (active) {
      this.onMouseOver();
    } else {
      this.onMouseOut();
    }
  }
});
