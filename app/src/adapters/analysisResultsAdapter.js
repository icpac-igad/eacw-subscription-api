const _ = require('lodash');

const GENERIC_ADAPTER = require('adapters/genericAdapter');
const GladAdapter = require('adapters/gladAdapter');
const StoryAdapter = require('adapters/storyAdapter');
const Forma250Adapter = require('adapters/forma250Adapter');
const MonthlySummaryAdapter = require('adapters/monthlySummaryAdapter');
const TerraiAdapter = require('adapters/terraiAdapter');
const ViirsAdapter = require('adapters/viirsAdapter');

const ADAPTER_MAP = {
    'glad-alerts': GladAdapter,
    'viirs-active-fires': ViirsAdapter,
    'monthly-summary': MonthlySummaryAdapter,
    story: StoryAdapter,
    forma250GFW: Forma250Adapter,
    'terrai-alerts': TerraiAdapter
};

class AnalysisResultsAdapter {

    static transform(results, layer) {
        const Adapter = ADAPTER_MAP[layer.slug] || GENERIC_ADAPTER;
        const adapter = new Adapter(results);

        return adapter.transform();
    }

    static isZero(results) {
        if (_.isArray(results.value)) {
            return _.filter(
                results.value,
                (n) => {
                    if (_.isObject(n)) {
                        return n.value > 0;
                    }
                    return n > 0;
                }
            ).length === 0;
        }
        return !results.value;

    }

}

module.exports = AnalysisResultsAdapter;
