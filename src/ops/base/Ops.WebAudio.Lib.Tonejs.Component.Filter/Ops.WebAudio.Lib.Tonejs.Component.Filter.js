op.name="Filter";

CABLES.WebAudio.createAudioContext(op);

// constants
var TYPES = ["lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "notch", "allpass", "peaking"];
var ROLLOFF_VALUES = [-12, -24, -48, -96];
var NORMAL_RANGE_MIN = 0;
var NORMAL_RANGE_MAX = 1;


var TYPE_DEFAULT = "lowpass";
var FREQUENCY_DEFAULT = 350;
var FREQUENCY_MIN = 1;
var FREQUENCY_MAX = 20000;
var DETUNE_DEFAULT = 0;
var DETUNE_MIN = 0;
var DETUNE_MAX = 1200;
var ROLLOFF_DEFAULT = -12;
var Q_DEFAULT = 1; // ?
var Q_MIN = 1; // ?
var Q_MAX = 20; // ?
var GAIN_DEFAULT = 0;
var GAIN_MIN = 0;
var GAIN_MAX = 2; // ?

// vars
var node = new Tone.Filter(FREQUENCY_DEFAULT, TYPE_DEFAULT, ROLLOFF_DEFAULT);

// input ports
var audioInPort = CABLES.WebAudio.createAudioInPort(op, "Audio In", node);
var frequencyPort = CABLES.WebAudio.createAudioParamInPort(op, "Frequency", node.frequency, {"display": "range", "min": FREQUENCY_MIN, "max": FREQUENCY_MAX}, FREQUENCY_DEFAULT);
var detunesPort = CABLES.WebAudio.createAudioParamInPort(op, "Detune", node.detunes, {"display": "range", "min": DETUNE_MIN, "max": DETUNE_MAX}, DETUNE_DEFAULT);
var gainPort = CABLES.WebAudio.createAudioParamInPort(op, "Gain", node.gain, {"display": "range", "min": GAIN_MIN, "max": GAIN_MAX}, GAIN_DEFAULT);
var qPort = CABLES.WebAudio.createAudioParamInPort(op, "Q", node.Q, {"display": "range", "min": Q_MIN, "max": Q_MAX}, Q_DEFAULT);
var typePort = op.addInPort( new Port( op, "Type", OP_PORT_TYPE_VALUE, { display: 'dropdown', values: TYPES }, TYPE_DEFAULT ) );
typePort.set(TYPE_DEFAULT);
var rolloffPort = op.addInPort( new Port( op, "Rolloff", OP_PORT_TYPE_VALUE, { display: 'dropdown', values: ROLLOFF_VALUES }, ROLLOFF_DEFAULT ) );
rolloffPort.set(ROLLOFF_DEFAULT);

// output ports
var audioOutPort = CABLES.WebAudio.createAudioOutPort(op, "Audio Out", node);