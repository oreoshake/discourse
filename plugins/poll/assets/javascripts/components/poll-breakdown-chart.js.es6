import I18n from "I18n";
import Component from "@ember/component";
import { mapBy } from "@ember/object/computed";
import { htmlSafe } from "@ember/template";
import { PIE_CHART_TYPE } from "discourse/plugins/poll/controllers/poll-ui-builder";
import { getColors } from "discourse/plugins/poll/lib/chart-colors";
import discourseComputed from "discourse-common/utils/decorators";

export default Component.extend({
  // Arguments:
  group: null,
  options: null,
  displayMode: null,
  highlightedOption: null,
  setHighlightedOption: null,

  classNames: "poll-breakdown-chart-container",

  _optionToSlice: {},
  _previousHighlightedSliceIndex: null,
  _previousDisplayMode: null,

  data: mapBy("options", "votes"),

  didInsertElement() {
    this._super(...arguments);

    const canvas = this.element.querySelector("canvas");
    this._chart = new window.Chart(canvas.getContext("2d"), this.chartConfig);
  },

  didReceiveAttrs() {
    this._super(...arguments);

    if (this._chart) {
      this._updateDisplayMode();
      this._updateHighlight();
    }
  },

  willDestroy() {
    this._super(...arguments);

    if (this._chart) {
      this._chart.destroy();
    }
  },

  @discourseComputed("optionColors", "index")
  colorStyle(optionColors, index) {
    return htmlSafe(`background: ${optionColors[index]};`);
  },

  @discourseComputed("data", "displayMode")
  chartConfig(data, displayMode) {
    const transformedData = [];
    let counter = 0;

    this.set("_optionToSlice", {});

    data.forEach((votes, index) => {
      if (votes > 0) {
        transformedData.push(votes);
        this._optionToSlice[index] = counter++;
      }
    });

    const totalVotes = transformedData.reduce((sum, votes) => sum + votes, 0);
    const colors = getColors(data.length).filter(
      (color, index) => data[index] > 0
    );

    return {
      type: PIE_CHART_TYPE,
      plugins: [window.ChartDataLabels],
      data: {
        datasets: [
          {
            data: transformedData,
            backgroundColor: colors,
            // TODO: It's a workaround for Chart.js' terrible hover styling.
            // It will break on non-white backgrounds.
            // Should be updated after #10341 lands
            hoverBorderColor: "#fff"
          }
        ]
      },
      options: {
        plugins: {
          datalabels: {
            color: "#333",
            backgroundColor: "rgba(255, 255, 255, 0.5)",
            borderRadius: 2,
            font: {
              family: getComputedStyle(document.body).fontFamily,
              size: 16
            },
            padding: {
              top: 2,
              right: 6,
              bottom: 2,
              left: 6
            },
            formatter(votes) {
              if (displayMode !== "percentage") {
                return votes;
              }

              const percent = I18n.toNumber((votes / totalVotes) * 100.0, {
                precision: 1
              });

              return `${percent}%`;
            }
          }
        },
        responsive: true,
        aspectRatio: 1.1,
        animation: { duration: 0 },
        tooltips: false,
        onHover: (event, activeElements) => {
          if (!activeElements.length) {
            this.setHighlightedOption(null);
            return;
          }

          const sliceIndex = activeElements[0]._index;
          const optionIndex = Object.keys(this._optionToSlice).find(
            option => this._optionToSlice[option] === sliceIndex
          );

          // Clear the array to avoid issues in Chart.js
          activeElements.length = 0;

          this.setHighlightedOption(Number(optionIndex));
        }
      }
    };
  },

  _updateDisplayMode() {
    if (this.displayMode !== this._previousDisplayMode) {
      const config = this.chartConfig;
      this._chart.data.datasets = config.data.datasets;
      this._chart.options = config.options;

      this._chart.update();
      this.set("_previousDisplayMode", this.displayMode);
    }
  },

  _updateHighlight() {
    const meta = this._chart.getDatasetMeta(0);

    if (this._previousHighlightedSliceIndex !== null) {
      const slice = meta.data[this._previousHighlightedSliceIndex];
      meta.controller.removeHoverStyle(slice);
      this._chart.draw();
    }

    if (this.highlightedOption === null) {
      this.set("_previousHighlightedSliceIndex", null);
      return;
    }

    const sliceIndex = this._optionToSlice[this.highlightedOption];
    if (typeof sliceIndex === "undefined") {
      this.set("_previousHighlightedSliceIndex", null);
      return;
    }

    const slice = meta.data[sliceIndex];
    this.set("_previousHighlightedSliceIndex", sliceIndex);
    meta.controller.setHoverStyle(slice);
    this._chart.draw();
  }
});
