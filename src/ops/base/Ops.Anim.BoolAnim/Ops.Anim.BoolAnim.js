op.name="BoolAnim";

var exe=op.addInPort(new Port(op,"exe",OP_PORT_TYPE_FUNCTION));
var bool=op.addInPort(new Port(op,"bool",OP_PORT_TYPE_VALUE,{display:'bool'}));
var duration=op.addInPort(new Port(op,"duration",OP_PORT_TYPE_VALUE));

var valueFalse=op.addInPort(new Port(op,"value false",OP_PORT_TYPE_VALUE));
var valueTrue=op.addInPort(new Port(op,"value true",OP_PORT_TYPE_VALUE));

valueFalse.set(0);
valueTrue.set(1);
duration.set(0.3);
var next=op.addOutPort(new Port(op,"trigger",OP_PORT_TYPE_FUNCTION));
var value=op.addOutPort(new Port(op,"value",OP_PORT_TYPE_VALUE));

var anim=new CABLES.TL.Anim();

var startTime=Date.now();

function setAnim()
{
    var now=(Date.now()-startTime)/1000;
    
    var oldValue=anim.getValue(now);
    anim.clear();
    
    anim.setValue(now,oldValue);
    
    if(!bool.get()) anim.setValue(now+duration.get(),valueFalse.get());
        else anim.setValue(now+duration.get(),valueTrue.get());

}

bool.onValueChanged=setAnim;


exe.onTriggered=function()
{
    value.set(anim.getValue( (Date.now()-startTime)/1000 ));
    next.trigger();
};

setAnim();


