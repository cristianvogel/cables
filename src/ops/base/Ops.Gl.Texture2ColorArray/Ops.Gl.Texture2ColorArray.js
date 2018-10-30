const
    cgl = op.patch.cgl,
    pUpdate = op.inTrigger("update"),
    tex = op.inObject("texture"),
    outTrigger = op.outTrigger("trigger"),
    outColors = op.outArray("Colors")
;

var
    fb = null,
    pixelData = null,
    texChanged = false
;

tex.onChange = function (){ texChanged=true; };
pUpdate.onTriggered = function () {
    var realTexture = tex.get(), gl = cgl.gl;
    if (!realTexture) return;
    if (!fb) fb = gl.createFramebuffer();
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    
    if (texChanged) {
        gl.framebufferTexture2D(
           gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
           gl.TEXTURE_2D, realTexture.tex, 0
        );
        pixelData = new Uint8Array(realTexture.width*realTexture.height*4);
        texChanged = false;
    }
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    
    gl.readPixels(
       0, 0,
       realTexture.width,
       realTexture.height,
       gl.RGBA,
       gl.UNSIGNED_BYTE,
       pixelData
    );        
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    outColors.set(null);
    outColors.set(pixelData);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    outTrigger.trigger();
}
