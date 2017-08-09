op.name="OrbitControls";

var render=op.addInPort(new Port(op,"render",OP_PORT_TYPE_FUNCTION));
var minDist=op.addInPort(new Port(op,"min distance",OP_PORT_TYPE_VALUE));
var maxDist=op.addInPort(new Port(op,"max distance",OP_PORT_TYPE_VALUE));
var initialAxis=op.addInPort(new Port(op,"initial axis y",OP_PORT_TYPE_VALUE,{display:'range'}));
var initialX=op.addInPort(new Port(op,"initial axis x",OP_PORT_TYPE_VALUE,{display:'range'}));
var initialRadius=op.inValue("initial radius",5);

var mul=op.addInPort(new Port(op,"mul",OP_PORT_TYPE_VALUE));

var smoothness=op.inValueSlider("Smoothness",1.0);
var restricted=op.addInPort(new Port(op,"restricted",OP_PORT_TYPE_VALUE,{display:'bool'}));

var active=op.inValueBool("Active",true);

var inReset=op.inFunctionButton("Reset");
var trigger=op.addOutPort(new Port(op,"trigger",OP_PORT_TYPE_FUNCTION));
var outRadius=op.addOutPort(new Port(op,"radius",OP_PORT_TYPE_VALUE));

var allowPanning=op.inValueBool("Allow Panning",true);
var allowZooming=op.inValueBool("Allow Zooming",true);
var pointerLock=op.inValueBool("Pointerlock",false);



restricted.set(true);
mul.set(1);
minDist.set(0.05);
maxDist.set(99999);
initialAxis.set(0.5);
initialX.set(0.0);
inReset.onTriggered=reset;

var cgl=op.patch.cgl;
var eye=vec3.create();
var vUp=vec3.create();
var vCenter=vec3.create();
var viewMatrix=mat4.create();
var vOffset=vec3.create();

var mouseDown=false;
var radius=5;
outRadius.set(radius);

var lastMouseX=0,lastMouseY=0;
var percX=0,percY=0;

vec3.set(vCenter, 0,0,0);
vec3.set(vUp, 0,1,0);

var tempEye=vec3.create();
var finalEye=vec3.create();
var tempCenter=vec3.create();

var px=0;
var py=0;

var divisor=1;
updateSmoothness();

op.onDelete=unbind;

var doLockPointer=false;

pointerLock.onChange=function()
{
    doLockPointer=pointerLock.get();
    console.log("doLockPointer",doLockPointer);
};

function reset()
{
    percX=(initialX.get()*Math.PI*2);
    percY=(initialAxis.get()-0.5);
    radius=initialRadius.get();
    eye=circlePos( percY );
}

function updateSmoothness()
{
    divisor=smoothness.get()*10;
}

smoothness.onChange=updateSmoothness;

function ip(val,goal)
{
    return val+(goal-val)/divisor;
}

render.onTriggered=function()
{
    cgl.pushViewMatrix();

    px=ip(px,percX);
    py=ip(py,percY);

    eye=circlePos(py);

    vec3.add(tempEye, eye, vOffset);
    vec3.add(tempCenter, vCenter, vOffset);

    finalEye[0]=ip(finalEye[0],tempEye[0]);
    finalEye[1]=ip(finalEye[1],tempEye[1]);
    finalEye[2]=ip(finalEye[2],tempEye[2]);
    
    mat4.lookAt(viewMatrix, finalEye, tempCenter, vUp);
    mat4.rotate(viewMatrix, viewMatrix, px, vUp);
    mat4.multiply(cgl.vMatrix,cgl.vMatrix,viewMatrix);

    trigger.trigger();
    cgl.popViewMatrix();
};

function circlePos(perc)
{
    if(radius<minDist.get()*mul.get())radius=minDist.get()*mul.get();
    if(radius>maxDist.get()*mul.get())radius=maxDist.get()*mul.get();
    
    outRadius.set(radius*mul.get());
    
    var i=0,degInRad=0;
    var vec=vec3.create();
    degInRad = 360*perc/2*CGL.DEG2RAD;
    vec3.set(vec,
        Math.cos(degInRad)*radius*mul.get(),
        Math.sin(degInRad)*radius*mul.get(),
        0);
    return vec;
}

function onmousemove(event)
{
    if(!mouseDown) return;

    var x = event.clientX;
    var y = event.clientY;
    
    var movementX=x-lastMouseX;
    var movementY=y-lastMouseY;
    
    if(doLockPointer)
    {
        movementX=event.movementX*mul.get();
        movementY=event.movementY*mul.get();
    }

    if(event.which==3 && allowPanning.get())
    {
        vOffset[2]+=(movementX)*0.01*mul.get();
        vOffset[1]+=(movementY)*0.01*mul.get();
    }
    else
    if(event.which==2 && allowZooming.get())
    {
        radius+=(movementY)*0.05;
        eye=circlePos(percY);
    }
    else
    {
        percX+=(movementX)*0.003;
        percY+=(movementY)*0.002;
        
        if(restricted.get())
        {
            if(percY>0.5)percY=0.5;
            if(percY<-0.5)percY=-0.5;
        }
    }

    lastMouseX=x;
    lastMouseY=y;
}

function onMouseDown(event)
{
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
    mouseDown=true;
    
    if(doLockPointer)
    {
        var el=op.patch.cgl.canvas;
        el.requestPointerLock = el.requestPointerLock || el.mozRequestPointerLock || el.webkitRequestPointerLock;
        if(el.requestPointerLock) el.requestPointerLock();
        else console.log("no t found");
        // document.addEventListener("mousemove", onmousemove, false);

        document.addEventListener('pointerlockchange', lockChange, false);
        document.addEventListener('mozpointerlockchange', lockChange, false);
        document.addEventListener('webkitpointerlockchange', lockChange, false);

    }
}

function onMouseUp()
{
    mouseDown=false;
    // cgl.canvas.style.cursor='url(/ui/img/rotate.png),pointer';
            
    if(doLockPointer)
    {
        document.removeEventListener('pointerlockchange', lockChange, false);
        document.removeEventListener('mozpointerlockchange', lockChange, false);
        document.removeEventListener('webkitpointerlockchange', lockChange, false);

        if(document.exitPointerLock) document.exitPointerLock();
        document.removeEventListener("mousemove", onmousemove, false);
    }

}

function lockChange()
{
    var el=op.patch.cgl.canvas;

    if (document.pointerLockElement === el || document.mozPointerLockElement === el || document.webkitPointerLockElement === el)
    {
        document.addEventListener("mousemove", onmousemove, false);
        console.log("listening...");
    }
    

}

function onMouseEnter(e)
{
    // cgl.canvas.style.cursor='url(/ui/img/rotate.png),pointer';
}

initialX.onValueChange(function()
{
    percX=(initialX.get()*Math.PI*2);
    
});

initialAxis.onValueChange(function()
{
    percY=(initialAxis.get()-0.5);
    eye=circlePos( percY );
});

var onMouseWheel=function(event)
{
    if(allowZooming.get())
    {
        var delta=CGL.getWheelSpeed(event)*0.06;
        radius+=(parseFloat(delta))*1.2;
    
        eye=circlePos(percY);
        event.preventDefault();
    }
};

var ontouchstart=function(event)
{
    if(event.touches && event.touches.length>0) onMouseDown(event.touches[0]);
};

var ontouchend=function(event)
{
    onMouseUp();
};

var ontouchmove=function(event)
{
    if(event.touches && event.touches.length>0) onmousemove(event.touches[0]);
};

active.onChange=function()
{
    if(active.get())bind();
        else unbind();
}

function bind()
{
    cgl.canvas.addEventListener('mousemove', onmousemove);
    cgl.canvas.addEventListener('mousedown', onMouseDown);
    cgl.canvas.addEventListener('mouseup', onMouseUp);
    cgl.canvas.addEventListener('mouseleave', onMouseUp);
    cgl.canvas.addEventListener('mouseenter', onMouseEnter);
    cgl.canvas.addEventListener('contextmenu', function(e){e.preventDefault();});
    cgl.canvas.addEventListener('wheel', onMouseWheel);

    cgl.canvas.addEventListener('touchmove', ontouchmove);
    cgl.canvas.addEventListener('touchstart', ontouchstart);
    cgl.canvas.addEventListener('touchend', ontouchend);

}

function unbind()
{
    cgl.canvas.removeEventListener('mousemove', onmousemove);
    cgl.canvas.removeEventListener('mousedown', onMouseDown);
    cgl.canvas.removeEventListener('mouseup', onMouseUp);
    cgl.canvas.removeEventListener('mouseleave', onMouseUp);
    cgl.canvas.removeEventListener('mouseenter', onMouseUp);
    cgl.canvas.removeEventListener('wheel', onMouseWheel);

    cgl.canvas.removeEventListener('touchmove', ontouchmove);
    cgl.canvas.removeEventListener('touchstart', ontouchstart);
    cgl.canvas.removeEventListener('touchend', ontouchend);
}



eye=circlePos(0);


bind();