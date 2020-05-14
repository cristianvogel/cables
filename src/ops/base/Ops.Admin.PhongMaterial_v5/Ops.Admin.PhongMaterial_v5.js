function Light(config) {
     this.type = config.type || "point";
     this.color = config.color || [1, 1, 1];
     this.specular = config.specular || [0, 0, 0];
     this.position = config.position || null;
     this.intensity = config.intensity || 1;
     this.radius = config.radius || 1;
     this.falloff = config.falloff || 1;
     this.spotExponent = config.spotExponent || 1;
     this.cosConeAngleInner = Math.cos(CGL.DEG2RAD*config.coneAngleInner) || 0; // spot light
     this.cosConeAngle = config.cosConeAngle || 0;
     this.conePointAt = config.conePointAt || [0, 0, 0];
     return this;
}

const cgl = op.patch.cgl;

const DEFAULT_FRAGMENT_HEAD = `
UNI Light light0;
`;

const DEFAULT_FRAGMENT_BODY = `
// DEFAULT_LIGHT
vec3 lightDirection0 = normalize(light0.position - modelPos.xyz);
float lambert0 = 1.; // inout variable
vec3 diffuseColor0 = CalculateDiffuseColor(lightDirection0, normal, light0.color, baseColor, lambert0);
// diffuseColor0 *= light0.lightProperties.INTENSITY;
vec3 specularColor0 = CalculateSpecularColor(
    light0.specular,
    inMaterialProperties.SPECULAR_AMT,
    inMaterialProperties.SHININESS,
    lightDirection0,
    viewDirection,
    normal,
    lambert0
);
vec3 combinedColor0 = (diffuseColor0 + specularColor0);
calculatedColor += combinedColor0;
`;

const createFragmentHead = (n, type) => {
    return `UNI Light light${n};`;
};

const createFragmentBody = (n, type) => {
    if (type === "ambient") {
        return `
    // ${type.toUpperCase()} LIGHT
    vec3 diffuseColor${n} = light${n}.lightProperties.INTENSITY*light${n}.color;
    calculatedColor += diffuseColor${n};
    `;
    }

    let fragmentCode = `
    // ${type.toUpperCase()} LIGHT
    vec3 lightDirection${n} = ${type !== "directional" ?
        `normalize(light${n}.position - modelPos.xyz)`
        : `light${n}.position`};

    float lambert${n} = 1.; // inout variable

    vec3 lightColor${n} = light${n}.color;
    vec3 lightSpecular${n} = light${n}.specular;

    #ifdef HAS_TEXTURES
        #ifdef HAS_TEXTURE_AO
            float aoIntensity = inTextureIntensities.AO;
            lightColor${n} *= mix(vec3(1.), texture(texAO, texCoord).rgb, aoIntensity);
        #endif

        #ifdef HAS_TEXTURE_SPECULAR
            float specularIntensity = inTextureIntensities.SPECULAR;
            lightSpecular${n} *= mix(1., texture(texSpecular, texCoord).r, specularIntensity);
        #endif
    #endif

    vec3 diffuseColor${n} = CalculateDiffuseColor(lightDirection${n}, normal, lightColor${n}, baseColor, lambert${n});
    vec3 specularColor${n} = CalculateSpecularColor(
        lightSpecular${n},
        inMaterialProperties.SPECULAR_AMT,
        inMaterialProperties.SHININESS,
        lightDirection${n},
        viewDirection,
        normal,
        lambert${n}
    );

    // vec3 combinedColor${n} = light.intensity * (diffuseColor + specularColor);
    vec3 combinedColor${n} = (diffuseColor${n} + specularColor${n});
    ${type === "spot" ? `
        float spotIntensity${n} = CalculateSpotLightEffect(
            light${n}.position, light${n}.conePointAt, light${n}.spotProperties.COSCONEANGLE,
            light${n}.spotProperties.COSCONEANGLEINNER, light${n}.spotProperties.SPOTEXPONENT,
            lightDirection${n}
        );
        combinedColor${n} *= spotIntensity${n};
    ` : ''}

    ${type !== "directional" ? `
    // vec3 lightModelDiff${n} = light${n}.position - modelPos.xyz;
    combinedColor${n} *= CalculateFalloff(lightDirection${n}, light${n}.lightProperties.FALLOFF);
    ` : ''}
    `;

    fragmentCode = fragmentCode.concat(`
    combinedColor${n} *= light${n}.lightProperties.INTENSITY;
    calculatedColor += combinedColor${n};
    `);

    return fragmentCode;
};

function createDefaultShader() {
    let vertexShader = attachments.simosphong_vert;
    let fragmentShader = attachments.phong_frag;
    fragmentShader = fragmentShader.replace("//{PHONG_FRAGMENT_HEAD}", DEFAULT_FRAGMENT_HEAD);
    fragmentShader = fragmentShader.replace("//{PHONG_FRAGMENT_BODY}", DEFAULT_FRAGMENT_BODY);
    shader.setSource(vertexShader, fragmentShader);
}



const inTrigger = op.inTrigger("Trigger In");


// * DIFFUSE *
const inDiffuseR = op.inFloat("R", Math.random());
const inDiffuseG = op.inFloat("G", Math.random());
const inDiffuseB = op.inFloat("B", Math.random());
const inDiffuseA = op.inFloatSlider("A", 1);
const diffuseColors = [inDiffuseR, inDiffuseG, inDiffuseB, inDiffuseA];
op.setPortGroup("Diffuse Color", diffuseColors);

const inToggleOrenNayar = op.inBool("Enable", false);
const inAlbedo = op.inFloatSlider("Albedo", 0.707);
const inRoughness = op.inFloatSlider("Roughness", 0.835);

inToggleOrenNayar.setUiAttribs({ hidePort: true });
inAlbedo.setUiAttribs({ greyout: true });
inRoughness.setUiAttribs({ greyout: true });
inDiffuseR.setUiAttribs({ colorPick: true });
op.setPortGroup("Oren-Nayar Diffuse",[inToggleOrenNayar, inAlbedo, inRoughness]);


inToggleOrenNayar.onChange = function() {
    if (inToggleOrenNayar.get()) {
        shader.define("ENABLE_OREN_NAYAR_DIFFUSE");
        inAlbedo.setUiAttribs({ greyout: false });
        inRoughness.setUiAttribs({ greyout: false });
    } else {
        shader.removeDefine("ENABLE_OREN_NAYAR_DIFFUSE");
        inAlbedo.setUiAttribs({ greyout: true });
        inRoughness.setUiAttribs({ greyout: true });
    }
}

// * FRESNEL *
const inToggleFresnel=op.inValueBool("Active", false);
inToggleFresnel.setUiAttribs({ hidePort: true });
const inFresnel=op.inValueSlider("Fresnel Intensity", 0.7);
const inFresnelWidth = op.inFloat("Fresnel Width", 1);
const inFresnelExponent = op.inFloat("Fresnel Exponent", 6);
const inFresnelR = op.inFloat("Fresnel R", 1);
const inFresnelG = op.inFloat("Fresnel G", 1);
const inFresnelB = op.inFloat("Fresnel B", 1);
inFresnelR.setUiAttribs({ colorPick: true });

const fresnelArr = [inFresnel, inFresnelWidth, inFresnelExponent, inFresnelR, inFresnelG, inFresnelB];
fresnelArr.forEach(function(port) { port.setUiAttribs({ greyout: true })});
op.setPortGroup("Fresnel", fresnelArr.concat([inToggleFresnel]));

inToggleFresnel.onChange = function() {
    if (inToggleFresnel.get()) {
        shader.define("ENABLE_FRESNEL");
        fresnelArr.forEach(function(port) { port.setUiAttribs({ greyout: false }); })
    } else {
        shader.removeDefine("ENABLE_FRESNEL");
        fresnelArr.forEach(function(port) { port.setUiAttribs({ greyout: true }); })
    }
}

// * SPECULAR *
const inShininess = op.inFloat("Shininess", 4);
const inSpecularCoefficient = op.inFloatSlider("Specular Amount", 1);
const inSpecularMode = op.inSwitch("Specular Model", ["Blinn", "Schlick", "Phong", "Gauss"], "Blinn");

inSpecularMode.setUiAttribs({ hidePort: true });
const specularColors = [inShininess, inSpecularCoefficient, inSpecularMode];
op.setPortGroup("Specular", specularColors);



// * LIGHT *
const inEnergyConservation = op.inValueBool("Energy Conservation", false);
const inToggleDoubleSided = op.inBool("Double Sided Material", false);
const inFalloffMode = op.inSwitch("Falloff Mode",['A','B', 'C'], 'A');
inEnergyConservation.setUiAttribs({ hidePort: true });
inToggleDoubleSided.setUiAttribs({ hidePort: true });
inFalloffMode.setUiAttribs({ hidePort: true });
inFalloffMode.onChange = () => {
    const MODES = ["A", "B", "C"];
    shader.define("FALLOFF_MODE_" + inFalloffMode.get());
    MODES.filter(mode => mode !== inFalloffMode.get())
    .forEach(mode => shader.removeDefine("FALLOFF_MODE_" + mode));
}

const lightProps = [inEnergyConservation, inToggleDoubleSided, inFalloffMode];
op.setPortGroup("Light Options", lightProps);

// TEXTURES
const inDiffuseTexture = op.inTexture("Diffuse Texture");
const inSpecularTexture = op.inTexture("Specular Texture");
const inNormalTexture = op.inTexture("Normal Map");
const inAoTexture = op.inTexture("AO Texture");
const inEmissiveTexture = op.inTexture("Emissive Texture");
const inAlphaTexture = op.inTexture("Opacity Texture");
op.setPortGroup("Textures",[inDiffuseTexture, inSpecularTexture, inNormalTexture, inAoTexture, inEmissiveTexture, inAlphaTexture]);

// TEXTURE TRANSFORMS
const inColorizeTexture = op.inBool("Colorize Texture",false);
const inDiffuseRepeatX = op.inFloat("Diffuse Repeat X", 1);
const inDiffuseRepeatY = op.inFloat("Diffuse Repeat Y", 1);
const inTextureOffsetX = op.inFloat("Texture Offset X", 0);
const inTextureOffsetY = op.inFloat("Texture Offset Y", 0);
const inSpecularIntensity = op.inFloatSlider("Specular Intensity", 1);
const inNormalIntensity = op.inFloatSlider("Normal Map Intensity", 0.5);
const inAoIntensity = op.inFloatSlider("AO Intensity", 1);
const inEmissiveIntensity = op.inFloat("Emissive Intensity", 1);

inColorizeTexture.setUiAttribs({ hidePort: true });
op.setPortGroup("Texture Transforms",[inNormalIntensity, inAoIntensity, inSpecularIntensity, inEmissiveIntensity, inColorizeTexture, inDiffuseRepeatY, inDiffuseRepeatX, inTextureOffsetY, inTextureOffsetX]);

const alphaMaskSource=op.inSwitch("Alpha Mask Source",["Luminance","R","G","B","A"],"Luminance");
alphaMaskSource.setUiAttribs({ greyout:true });

const discardTransPxl=op.inValueBool("Discard Transparent Pixels");
discardTransPxl.setUiAttribs({ hidePort: true });

op.setPortGroup("Opacity Texture",[alphaMaskSource, discardTransPxl]);



const outTrigger = op.outTrigger("Trigger Out");
const shaderOut = op.outObject("Shader");
shaderOut.ignoreValueSerialize = true;


const shader = new CGL.Shader(cgl,"simosphong");
shader.setModules(['MODULE_VERTEX_POSITION', 'MODULE_COLOR', 'MODULE_BEGIN_FRAG']);
shader.setSource(attachments.simosphong_vert, attachments.simosphong_frag);
let recompileShader = false;

shader.define("FALLOFF_MODE_A");

function createShader(lightStack) {
    // let vertexShader = attachments.lambert_vert;
    let fragmentShader = attachments.phong_frag;

    // let vertexHead = '';
    // let vertexBody = '';

    let fragmentHead = '';
    let fragmentBody = '';

    for (let i = 0; i < lightStack.length; i += 1) {
        const light = lightStack[i];
        // vertexHead = vertexHead.concat(createVertexHead(i, light.type));
        // vertexBody = vertexBody.concat(createVertexBody(i, light.type));

        fragmentHead = fragmentHead.concat(createFragmentHead(i, light.type));
        fragmentBody = fragmentBody.concat(createFragmentBody(i, light.type));
    }

    // vertexShader = vertexShader.replace("//{SHADOW_VERTEX_HEAD}", vertexHead);
    // vertexShader = vertexShader.replace("//{SHADOW_VERTEX_BODY}", vertexBody);

    fragmentShader = fragmentShader.replace("//{PHONG_FRAGMENT_HEAD}", fragmentHead);
    fragmentShader = fragmentShader.replace("//{PHONG_FRAGMENT_BODY}", fragmentBody);

    shader.setSource(attachments.simosphong_vert, fragmentShader);

}


shaderOut.set(shader);

let diffuseTextureUniform = null;
let specularTextureUniform = null;
let normalTextureUniform = null;
let aoTextureUniform = null;
let emissiveTextureUniform = null;
let alphaTextureUniform = null;


inColorizeTexture.onChange = function() {
    shader.toggleDefine("COLORIZE_TEXTURE", inColorizeTexture.get());
}
function updateDiffuseTexture() {
    if (inDiffuseTexture.get()) {
            if(!shader.hasDefine('HAS_TEXTURE_DIFFUSE')) {
                shader.define('HAS_TEXTURE_DIFFUSE');
                if (!diffuseTextureUniform) diffuseTextureUniform = new CGL.Uniform(shader, 't', 'texDiffuse', 0);
            }
    } else {
                shader.removeUniform('texDiffuse');
                shader.removeDefine('HAS_TEXTURE_DIFFUSE');
                diffuseTextureUniform = null;
            }
}

function updateSpecularTexture() {
    if (inSpecularTexture.get()) {
        if(!shader.hasDefine('HAS_TEXTURE_SPECULAR')) {
            shader.define('HAS_TEXTURE_SPECULAR');
            if (!specularTextureUniform) specularTextureUniform = new CGL.Uniform(shader, 't', 'texSpecular', 1);
        }
    } else {
        shader.removeUniform('texSpecular');
        shader.removeDefine('HAS_TEXTURE_SPECULAR');
        specularTextureUniform = null;
        }
}

function updateNormalTexture() {
    if (inNormalTexture.get()) {
        if(!shader.hasDefine('HAS_TEXTURE_NORMAL')) {
            shader.define('HAS_TEXTURE_NORMAL');
            if (!normalTextureUniform) normalTextureUniform = new CGL.Uniform(shader, 't', 'texNormal', 2);
        }
    } else {
        shader.removeUniform('texNormal');
        shader.removeDefine('HAS_TEXTURE_NORMAL');
        normalTextureUniform = null;
        }
}

function updateAoTexture() {
    if (inAoTexture.get()) {
        if(!shader.hasDefine('HAS_TEXTURE_AO')) {
            shader.define('HAS_TEXTURE_AO');
            if (!aoTextureUniform) aoTextureUniform = new CGL.Uniform(shader, 't', 'texAO', 3);
        }
    } else {
        shader.removeUniform('texAO');
        shader.removeDefine('HAS_TEXTURE_AO');
        aoTextureUniform = null;
        }
}

function updateEmissiveTexture() {
    if (inEmissiveTexture.get()) {
        if(!shader.hasDefine('HAS_TEXTURE_EMISSIVE')) {
            shader.define('HAS_TEXTURE_EMISSIVE');
            if (!emissiveTextureUniform) emissiveTextureUniform = new CGL.Uniform(shader, 't', 'texEmissive', 4);
        }
    } else {
        shader.removeUniform('texEmissive');
        shader.removeDefine('HAS_TEXTURE_EMISSIVE');
        emissiveTextureUniform = null;
    }
}

// TEX OPACITY

function updateAlphaMaskMethod()
{
    if(alphaMaskSource.get()=='Alpha Channel') shader.define('ALPHA_MASK_ALPHA');
        else shader.removeDefine('ALPHA_MASK_ALPHA');

    if(alphaMaskSource.get()=='Luminance') shader.define('ALPHA_MASK_LUMI');
        else shader.removeDefine('ALPHA_MASK_LUMI');

    if(alphaMaskSource.get()=='R') shader.define('ALPHA_MASK_R');
        else shader.removeDefine('ALPHA_MASK_R');

    if(alphaMaskSource.get()=='G') shader.define('ALPHA_MASK_G');
        else shader.removeDefine('ALPHA_MASK_G');

    if(alphaMaskSource.get()=='B') shader.define('ALPHA_MASK_B');
        else shader.removeDefine('ALPHA_MASK_B');
}
alphaMaskSource.onChange=updateAlphaMaskMethod;

function updateAlphaTexture()
{
    if(inAlphaTexture.get())
    {
        if(alphaTextureUniform !== null) return;
        shader.removeUniform('texAlpha');
        shader.define('HAS_TEXTURE_ALPHA');
        if(!alphaTextureUniform) alphaTextureUniform = new CGL.Uniform(shader,'t','texAlpha', 5);

        alphaMaskSource.setUiAttribs({greyout:false});
        discardTransPxl.setUiAttribs({greyout:false});

    }
    else
    {
        shader.removeUniform('texAlpha');
        shader.removeDefine('HAS_TEXTURE_ALPHA');
        alphaTextureUniform = null;

        alphaMaskSource.setUiAttribs({greyout:true});
        discardTransPxl.setUiAttribs({greyout:true});
    }
    updateAlphaMaskMethod();
};

discardTransPxl.onChange=function()
{
    shader.toggleDefine("DISCARDTRANS", discardTransPxl.get());
};

inDiffuseTexture.onChange = updateDiffuseTexture;
inSpecularTexture.onChange = updateSpecularTexture;
inNormalTexture.onChange = updateNormalTexture;
inAoTexture.onChange = updateAoTexture;
inEmissiveTexture.onChange = updateEmissiveTexture;
inAlphaTexture.onChange = updateAlphaTexture;

const MAX_UNIFORM_FRAGMENTS = cgl.gl.getParameter(cgl.gl.MAX_FRAGMENT_UNIFORM_VECTORS);
const MAX_LIGHTS = MAX_UNIFORM_FRAGMENTS === 64 ? 6 : 16;

shader.define('MAX_LIGHTS', MAX_LIGHTS.toString());
shader.define("SPECULAR_PHONG");

const LIGHT_TYPES = {
    none: -1,
    ambient: 0,
    point: 1,
    directional: 2,
    spot: 3,
};

inSpecularMode.onChange = function() {
    if (inSpecularMode.get() === "Phong") {
        shader.define("SPECULAR_PHONG");
        shader.removeDefine("SPECULAR_BLINN");
        shader.removeDefine("SPECULAR_GAUSS");
        shader.removeDefine("SPECULAR_SCHLICK");
    } else if (inSpecularMode.get() === "Blinn") {
        shader.define("SPECULAR_BLINN");
        shader.removeDefine("SPECULAR_PHONG");
        shader.removeDefine("SPECULAR_GAUSS");
        shader.removeDefine("SPECULAR_SCHLICK");
    } else if (inSpecularMode.get() === "Gauss") {
        shader.define("SPECULAR_GAUSS");
        shader.removeDefine("SPECULAR_BLINN");
        shader.removeDefine("SPECULAR_PHONG");
        shader.removeDefine("SPECULAR_SCHLICK");
    } else if (inSpecularMode.get() === "Schlick") {
        shader.define("SPECULAR_SCHLICK");
        shader.removeDefine("SPECULAR_BLINN");
        shader.removeDefine("SPECULAR_PHONG");
        shader.removeDefine("SPECULAR_GAUSS");
    }
}

inEnergyConservation.onChange = function() {
    shader.toggleDefine("CONSERVE_ENERGY", inEnergyConservation.get());
}

inToggleDoubleSided.onChange = function () {
    shader.toggleDefine("DOUBLE_SIDED", inToggleDoubleSided.get());
}

// * INIT UNIFORMS *
const initialUniforms = [
    new CGL.Uniform(shader, "4f", "inMaterialProperties", inAlbedo, inRoughness, inShininess, inSpecularCoefficient),
    new CGL.Uniform(shader, "4f", "inDiffuseColor", inDiffuseR, inDiffuseG, inDiffuseB, inDiffuseA),
    new CGL.Uniform(shader, "4f", "inTextureIntensities", inNormalIntensity, inAoIntensity, inSpecularIntensity, inEmissiveIntensity),
    new CGL.Uniform(shader, "4f", "inTextureRepeatOffset", inDiffuseRepeatX, inDiffuseRepeatY, inTextureOffsetX, inTextureOffsetY),
    new CGL.Uniform(shader, "4f", "inFresnel", inFresnelR, inFresnelG, inFresnelB, inFresnel),
    new CGL.Uniform(shader, "2f", "inFresnelWidthExponent", inFresnelWidth, inFresnelExponent),

];

const lightUniforms = [];
let oldCount = 0;

function createUniforms(lightsCount) {
    for (let i = 0; i < lightUniforms.length; i += 1) {
        lightUniforms[i] = null;
    }

    for (let i = 0; i < lightsCount; i += 1) {
        lightUniforms[i] = null;
        if (!lightUniforms[i]) {
            lightUniforms[i] = {
                color: new CGL.Uniform(shader,'3f','light' + i + '.color', [1,1,1]),
                position: new CGL.Uniform(shader,'3f','light' + i + '.position',[0,11,0]),
                specular: new CGL.Uniform(shader,'3f','light' + i + '.specular', [1,1,1]),
                // intensity, attenuation, falloff, radius
                lightProperties: new CGL.Uniform(shader, '4f', 'light' + i + '.lightProperties', [1,1,1,1]),
                // typeCastShadow: new CGL.Uniform(shader, '2i', 'light' + i + '.typeCastShadow', [0, 0]),
                // castShadow: new CGL.Uniform(shader,'i','light' + i + '.castShadow', 0),


                conePointAt: new CGL.Uniform(shader,'3f','light' + i + '.conePointAt', vec3.create()),
                spotProperties: new CGL.Uniform(shader, '3f', 'light' + i + '.spotProperties', [0,0,0,0]),

                // shadowProperties: new CGL.Uniform(shader, '4f', 'light' + i + '.shadowProperties', [0,0,0,0]),
                // shadowStrength: new CGL.Uniform(shader, 'f', 'light' + i + '.shadowStrength', 1),

                // shadowMap:  null,

                // vertex shader
                // normalOffset:  new CGL.Uniform(shader, 'f', 'normalOffset' + i, 0),
                // lightMatrix:  new CGL.Uniform(shader,'m4','lightMatrix' + i, mat4.create()),
            };
        }
    }
}

function setDefaultUniform(light) {
        defaultUniform.position.setValue(light.position);
        defaultUniform.color.setValue(light.color);
        defaultUniform.specular.setValue(light.specular);
        defaultUniform.lightProperties.setValue([
            light.intensity,
            light.attenuation,
            light.falloff,
            light.radius,
        ]);

        defaultUniform.conePointAt.setValue(light.conePointAt);
        defaultUniform.spotProperties.setValue([
            light.cosConeAngle,
            light.cosConeAngleInner,
            light.spotExponent,
        ]);
}

function setUniforms(lightStack) {
    for (let i = 0; i < lightStack.length; i += 1) {
        const light = lightStack[i];

        lightUniforms[i].position.setValue(light.position);
        lightUniforms[i].color.setValue(light.color);
        lightUniforms[i].specular.setValue(light.specular);

        lightUniforms[i].lightProperties.setValue([
            light.intensity,
            light.attenuation,
            light.falloff,
            light.radius,
        ]);

        lightUniforms[i].conePointAt.setValue(light.conePointAt);
        lightUniforms[i].spotProperties.setValue([
            light.cosConeAngle,
            light.cosConeAngleInner,
            light.spotExponent,
        ]);
    }
}

function compareLights(lightStack) {
    if (lightStack.length !== oldCount) {
        createShader(lightStack);
        createUniforms(lightStack.length);
        oldCount = lightStack.length;
        setUniforms(lightStack);
        recompileShader = false;
    } else {
        if (recompileShader) {
            createShader(lightStack);
            createUniforms(lightStack.length);
            recompileShader = false;
        }
        setUniforms(lightStack);
        return;
    }
}


let defaultUniform = null;

function createDefaultUniform() {
    defaultUniform = {
        color: new CGL.Uniform(shader,'3f','light' + 0 + '.color', [1,1,1]),
        specular: new CGL.Uniform(shader,'3f','light' + 0 + '.specular', [1,1,1]),
        position: new CGL.Uniform(shader,'3f','light' + 0 + '.position',[0,11,0]),

        // intensity, attenuation, falloff, radius
        lightProperties: new CGL.Uniform(shader, '4f', 'light' + 0 + '.lightProperties', [1,1,1,1]),
        //typeCastShadow: new CGL.Uniform(shader, '2i', 'light' + 0 + '.typeCastShadow', [0, 0]),
        //castShadow: new CGL.Uniform(shader,'i','light' + 0 + '.castShadow', 0),


        conePointAt: new CGL.Uniform(shader,'3f','light' + 0 + '.conePointAt', vec3.create()),
        spotProperties: new CGL.Uniform(shader, '3f', 'light' + 0 + '.spotProperties', [0,0,0,0]),

        // shadowProperties: new CGL.Uniform(shader, '4f', 'light' + 0 + '.shadowProperties', [0,0,0,0]),
        // shadowStrength: new CGL.Uniform(shader, 'f', 'light' + 0 + '.shadowStrength', 1),

        // shadowMap:  null,

        // vertex shader
        // normalOffset:  new CGL.Uniform(shader, 'f', 'normalOffset' + 0, 0),
        // lightMatrix:  new CGL.Uniform(shader,'m4','lightMatrix' + 0, mat4.create()),
    }
}

const DEFAULT_LIGHTSTACK = [{
   type: "point",
   position: [5, 5, 5],
   color: [1,1,1],
   specular: [1,1,1],
   intensity: 1,
   attenuation: 0,
   falloff: 0.5,
   radius: 80,
}];


function updateLights() {
    if((!cgl.frameStore.lightStack || !cgl.frameStore.lightStack.length)) {
        // if no light in light stack, use default light & set count to -1
        // so when a new light gets added, the shader does recompile
        if (!defaultUniform) {
            createDefaultShader();
            createDefaultUniform();
        }
        setDefaultUniform(DEFAULT_LIGHTSTACK[0]);
        oldCount = -1;

    } else {
        if(shader) {
            if (cgl.frameStore.lightStack) {
                if (cgl.frameStore.lightStack.length) {
                        defaultUniform = null;
                        compareLights(cgl.frameStore.lightStack);
                        return;
                    }
                }
        }
    }
};

const initialLight = new Light({
    type: "point",
    color: [0.8, 0.8, 0.8],
    specular: [1, 1, 1],
    position: [0, 2, 2.75],
    intensity: 1,
    radius: 15,
    falloff: 0.2,
    cosConeAngleInner: null,
    spotExponent: null,
    coneAngle: null,
    conePointAt: null,
});

const render = function() {
    if (!shader) {
        op.log("NO SHADER");
        return;
    }
    // if (cgl.shadowPass) {
    //    outTrigger.trigger();
    //} else {
        cgl.pushShader(shader);
        shader.popTextures();
        shader.define("HAS_TEXTURES");


        outTrigger.trigger();
        cgl.popShader();
//    }
}

op.preRender = function() {
    shader.bind();
    render();
}

/* transform for default light */
const inverseViewMat = mat4.create();
const vecTemp = vec3.create();
const camPos = vec3.create();

inTrigger.onTriggered = function() {
    if(!shader) {
        console.log("lambert has no shader...");
        return;
    }
//    if (cgl.frameStore.shadowPass) {
  //      outTrigger.trigger();
//    } else {
        cgl.setShader(shader);

        shader.popTextures();
        if (inDiffuseTexture.get()) shader.pushTexture(diffuseTextureUniform, inDiffuseTexture.get().tex);
        if (inSpecularTexture.get()) shader.pushTexture(specularTextureUniform, inSpecularTexture.get().tex);
        if (inNormalTexture.get())  shader.pushTexture(normalTextureUniform, inNormalTexture.get().tex);
        if (inAoTexture.get()) shader.pushTexture(aoTextureUniform, inAoTexture.get().tex);
        if (inEmissiveTexture.get()) shader.pushTexture(emissiveTextureUniform, inEmissiveTexture.get().tex);
        if (inAlphaTexture.get()) shader.pushTexture(alphaTextureUniform, inAlphaTexture.get().tex);
        updateLights();
        outTrigger.trigger();

        cgl.setPreviousShader();
  //  }
}

updateDiffuseTexture();
updateSpecularTexture();
updateNormalTexture();
updateAoTexture();
updateAlphaTexture();

