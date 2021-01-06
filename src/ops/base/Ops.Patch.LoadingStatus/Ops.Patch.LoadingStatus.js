const cgl = op.patch.cgl;
const patch = op.patch;

this.exe = this.addInPort(new CABLES.Port(op, "exe", CABLES.OP_PORT_TYPE_FUNCTION));
this.finished = this.addOutPort(new CABLES.Port(op, "finished", CABLES.OP_PORT_TYPE_FUNCTION));
const result = this.addOutPort(new CABLES.Port(op, "status", CABLES.OP_PORT_TYPE_VALUE));
const isFinishedPort = op.outValue("all loaded", false);
const preRenderStatus = this.addOutPort(new CABLES.Port(op, "preRenderStatus", CABLES.OP_PORT_TYPE_VALUE));
const preRenderTimeFrames = this.addInPort(new CABLES.Port(op, "preRenderTimes", CABLES.OP_PORT_TYPE_VALUE));
const preRenderOps = op.inValueBool("PreRender Ops");
const startTimeLine = op.inBool("Play Timeline", true);
preRenderStatus.set(0);
this.numAssets = this.addOutPort(new CABLES.Port(op, "numAssets", CABLES.OP_PORT_TYPE_VALUE));
this.loading = this.addOutPort(new CABLES.Port(op, "loading", CABLES.OP_PORT_TYPE_FUNCTION));
const loadingFinished = op.outTrigger("loading finished");// this.addOutPort(new CABLES.Port(op,"loading finished",CABLES.OP_PORT_TYPE_FUNCTION));

let finishedAll = false;
const preRenderTimes = [];
let firstTime = true;

const identTranslate = vec3.create();
vec3.set(identTranslate, 0, 0, 0);
const identTranslateView = vec3.create();
vec3.set(identTranslateView, 0, 0, -2);

document.body.classList.add("cables-loading");


let prerenderCount = 0;
const preRenderAnimFrame = function (t)
{
    const time = preRenderTimes[prerenderCount];

    preRenderStatus.set(prerenderCount / (preRenderTimeFrames.anim.keys.length - 1));

    op.patch.timer.setTime(time);
    cgl.renderStart(cgl, identTranslate, identTranslateView);

    this.finished.trigger();

    cgl.gl.clearColor(0, 0, 0, 1);
    cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT | cgl.gl.DEPTH_BUFFER_BIT);

    this.loading.trigger();

    cgl.renderEnd(cgl);
    prerenderCount++;
};

this.onAnimFrame = null;
const loadingIdPrerender = "";

this.onLoaded = function ()
{
    if (preRenderTimeFrames.isAnimated())
        if (preRenderTimeFrames.anim)
            for (let i = 0; i < preRenderTimeFrames.anim.keys.length; i++)
                preRenderTimes.push(preRenderTimeFrames.anim.keys[i].time);

    preRenderTimes.push(1);
};

function checkPreRender()
{
    if (patch.loading.getProgress() >= 1.0)
    {
        if (preRenderTimeFrames.anim && prerenderCount >= preRenderTimeFrames.anim.keys.length)
        {
            this.onAnimFrame = function () {};
            isFinishedPort.set(true);
            finishedAll = true;
        }
        else
        {
            setTimeout(checkPreRender, 30);
        }
    }
    else
    {
        setTimeout(checkPreRender, 100);
    }
}

const loadingId = patch.loading.start("delayloading", "delayloading");
setTimeout(function ()
{
    patch.loading.finished(loadingId);
}, 100);

this.exe.onTriggered = function ()
{
    result.set(patch.loading.getProgress());
    this.numAssets.set(patch.loading.getNumAssets());

    if (patch.loading.getProgress() >= 1.0 && finishedAll)
    {
        if (firstTime)
        {
            if (preRenderOps.get()) op.patch.preRenderOps();
            loadingFinished.trigger();
            op.patch.timer.setTime(0);
            if (startTimeLine.get())
            {
                op.patch.timer.play();
                isFinishedPort.set(true);
            }
            firstTime = false;
        }

        this.finished.trigger();
        document.body.classList.remove("cables-loading");
        document.body.classList.add("cables-loaded");
    }
    else
    {
        if (!preRenderTimeFrames.anim)
        {
            finishedAll = true;
            this.onAnimFrame = function () {};
        }

        if (preRenderTimeFrames.anim && patch.loading.getProgress() >= 1.0
            && prerenderCount < preRenderTimeFrames.anim.keys.length
        )
        {
            this.onAnimFrame = preRenderAnimFrame;
            checkPreRender();
            op.loading.trigger();
        }

        if (patch.loading.getProgress() < 1.0)
        {
            op.loading.trigger();
            op.patch.timer.setTime(0);
            op.patch.timer.pause();
        }
    }
};
