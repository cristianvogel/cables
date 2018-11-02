const render=op.inTrigger('render');
const amountX=op.addInPort(new CABLES.Port(op,"width",CABLES.OP_PORT_TYPE_VALUE,{  }));
const amountY=op.addInPort(new CABLES.Port(op,"height",CABLES.OP_PORT_TYPE_VALUE,{  }));
const trigger=op.outTrigger('trigger');

const cgl=op.patch.cgl;
const shader=new CGL.Shader(cgl);

shader.setSource(shader.getDefaultVertexShader(),attachments.pixelate_frag);
const textureUniform=new CGL.Uniform(shader,'t','tex',0);

const amountXUniform=new CGL.Uniform(shader,'f','amountX',0.0);
const amountYUniform=new CGL.Uniform(shader,'f','amountY',0.0);

amountX.set(320.0);
amountY.set(180.0);

amountX.onChange=function()
{
    amountXUniform.setValue(amountX.get());
};

amountY.onChange=function()
{
    amountYUniform.setValue(amountY.get());
};

render.onTriggered=function()
{
    if(!CGL.TextureEffect.checkOpInEffect(op)) return;

    cgl.setShader(shader);
    cgl.currentTextureEffect.bind();

    cgl.setTexture(0, cgl.currentTextureEffect.getCurrentSourceTexture().tex );

    cgl.currentTextureEffect.finish();
    cgl.setPreviousShader();

    trigger.trigger();
};

