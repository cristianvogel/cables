const
    render = op.inTrigger("render"),
    inMethod = op.inSwitch("Method", ["Auto Anim", "Interpolate Index"], "Auto Anim"),
    nextGeom = op.inValueInt("Geometry"),
    duration = op.inValue("Duration", 1.0),
    inIndex = op.inFloat("Index", 0),
    finished = op.outValue("Finished"),
    trigger = op.outTrigger("trigger");

const cgl = op.patch.cgl;
let mesh = null;
const inGeoms = [];

inIndex.onChange =
    nextGeom.onChange = updateGeom;

let oldGeom = 0;
const anim = new CABLES.Anim();
anim.clear();
anim.createPort(op, "Easing", updateGeom);

const geoms = [];
window.meshsequencecounter = window.meshsequencecounter || 1;
window.meshsequencecounter++;
const prfx = String.fromCharCode(97 + window.meshsequencecounter);
const needsUpdateFrame = false;
render.onTriggered = doRender;
inMethod.onChange = updateUi;

const srcHeadVert = ""
    .endl() + "IN vec3 " + prfx + "attrMorphTargetA;"
    .endl() + "IN vec3 " + prfx + "attrMorphTargetB;"
    .endl() + "UNI float {{mod}}fade;"
    .endl() + "UNI float {{mod}}doMorph;"
    .endl();

const srcBodyVert = ""
    .endl() + "if({{mod}}doMorph==1.0){"
    .endl() + "  pos = vec4( " + prfx + "attrMorphTargetA * {{mod}}fade + " + prfx + "attrMorphTargetB * (1.0 - {{mod}}fade ), 1. );"
    .endl() + "}"
    .endl();

let uniFade = null;
let module = null;
let shader = null;
let uniDoMorph = null;
let autoAnim = true;

for (let i = 0; i < 8; i++)
{
    const inGeom = op.inObject("Geometry " + (i));
    inGeom.onChange = updateMeshes;
    inGeoms.push(inGeom);
}

function updateUi()
{
    autoAnim = inMethod.get() == "Auto Anim";
    duration.setUiAttribs({ "greyout": !autoAnim });
    nextGeom.setUiAttribs({ "greyout": !autoAnim });

    inIndex.setUiAttribs({ "greyout": autoAnim });
}

function checkLength()
{
    op.setUiError("nosamelength", null);
    let oldGeomLength = 0;

    for (let i = 0; i < inGeoms.length; i++)
    {
        const geom = inGeoms[i].get();
        if (geom && geom._vertices)
        {
            if (oldGeomLength != 0 && oldGeomLength != geom._vertices.length) op.setUiError("nosamelength", "Geometries must have the same number of vertices!", 1);
            oldGeomLength = geom._vertices.length;
        }
    }
}

function updateMeshes()
{
    checkLength();
    if (mesh) return;

    for (let i = 0; i < inGeoms.length; i++)
    {
        const geom = inGeoms[i].get();
        if (geom && geom._vertices)
        {
            if (i === 0)
            {
                mesh = new CGL.Mesh(cgl, geom);

                mesh.addAttribute(prfx + "attrMorphTargetA", geom._vertices, 3);
                mesh.addAttribute(prfx + "attrMorphTargetB", geom._vertices, 3);
                // op.log("MESH BUILD");
                updateGeom();
            }
        }
    }
}

function updateGeom()
{
    let geom1;
    let geom2;

    if (autoAnim)
    {
        let getGeom = nextGeom.get();
        if (getGeom < 0) getGeom = 0;
        else if (getGeom >= 7) getGeom = 7;
        let temp = 0;

        if (oldGeom === getGeom) return;

        anim.clear();
        anim.setValue(op.patch.freeTimer.get(), 0);
        anim.setValue(op.patch.freeTimer.get() + duration.get(), 1,
            function ()
            {
                oldGeom = getGeom;
                finished.set(true);
            });
        finished.set(false);

        geom1 = inGeoms[oldGeom].get();
        temp = getGeom;
        geom2 = inGeoms[temp].get();
    }

    if (!autoAnim)
    {
        let a = Math.max(Math.floor(inIndex.get()), 0);
        let b = Math.min(Math.ceil(inIndex.get()), 7);

        geom1 = inGeoms[a].get();
        geom2 = inGeoms[b].get();
    }

    if (mesh && geom1 && geom2 && geom1._vertices && geom2._vertices)
    {
        mesh.updateAttribute(prfx + "attrMorphTargetB", geom1._vertices);
        mesh.updateAttribute(prfx + "attrMorphTargetA", geom2._vertices);
    }
}

function removeModule()
{
    if (shader && module)
    {
        shader.removeModule(module);
        shader = null;
    }
}

function doRender()
{
    if (cgl.getShader() && cgl.getShader() != shader)
    {
        if (shader) removeModule();

        shader = cgl.getShader();
        module = shader.addModule(
            {
                "name": "MODULE_VERTEX_POSITION",
                "srcHeadVert": srcHeadVert,
                "srcBodyVert": srcBodyVert
            });

        uniFade = new CGL.Uniform(shader, "f", module.prefix + "fade", 0);
        uniDoMorph = new CGL.Uniform(shader, "f", module.prefix + "doMorph", 1);
    }

    if (uniDoMorph)
    {
        if (autoAnim)
        {
            uniFade.setValue(anim.getValue(op.patch.freeTimer.get()));
        }
        else
        {
            console.log(inIndex.get() % 1);
            uniFade.setValue(inIndex.get() % 1);
        }

        uniDoMorph.setValue(1.0);
        if (mesh !== null) mesh.render(cgl.getShader());
        uniDoMorph.setValue(0);
        trigger.trigger();
    }
}
