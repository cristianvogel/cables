const
    exe = op.addInPort(new CABLES.Port(op, "exe", CABLES.OP_PORT_TYPE_FUNCTION)),
    preRenderOps = op.inBool("PreRender Ops"),
    startTimeLine = op.inBool("Play Timeline", true),

    next = op.outTrigger("Next"),
    outInitialFinished = op.outBool("Finished Initial Loading", false),
    outLoading = op.outBool("Loading"),
    outProgress = op.outNumber("Progress"),
    outList = op.outArray("Jobs"),
    loadingFinished = op.outTrigger("Trigger Loading Finished ");

const cgl = op.patch.cgl;
const patch = op.patch;

let finishedOnce = false;
const preRenderTimes = [];
let firstTime = true;

document.body.classList.add("cables-loading");

let loadingId = cgl.patch.loading.start("loadingStatusInit", "loadingStatusInit");

exe.onTriggered = () =>
{
    const jobs = op.patch.loading.getListJobs();
    outProgress.set(patch.loading.getProgress());

    let hasFinished = jobs.length === 0;
    const notFinished = !hasFinished;
    // outLoading.set(!hasFinished);

    if (notFinished)
    {
        outList.set(op.patch.loading.getListJobs());
    }

    if (notFinished)
    {
        if (firstTime)
        {
            if (preRenderOps.get()) op.patch.preRenderOps();
            op.patch.timer.setTime(0);
            if (startTimeLine.get())
            {
                op.patch.timer.play();
            }
        }
        firstTime = false;

        document.body.classList.remove("cables-loading");
        document.body.classList.add("cables-loaded");
    }
    else
    {
        finishedOnce = true;
        outList.set(op.patch.loading.getListJobs());

        if (patch.loading.getProgress() < 1.0)
        {
            op.patch.timer.setTime(0);
            op.patch.timer.pause();
        }
    }

    outInitialFinished.set(finishedOnce);

    if (outLoading.get() && hasFinished) loadingFinished.trigger();

    outLoading.set(notFinished);

    next.trigger();

    if (loadingId)
    {
        cgl.patch.loading.finished(loadingId);
        loadingId = null;
    }
};
