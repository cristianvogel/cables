const
    trigger=this.inTrigger("trigger"),
    value=this.inValueFloat("value"),
    index=this.inValueInt("index"),
    inReset=this.inTriggerButton("reset"),
    inShowMinMax=op.inBool("Show Min/Max"),
    inSeed=op.inValueFloat("Color Random Seed",23),
    inWidth=op.inValueInt("Texture Width",512),
    inHeight=op.inValueInt("Texture Height",512),

    texOut=op.outTexture("Texture");



const cgl=op.patch.cgl;

var canvas = document.createElement('canvas');
canvas.id     = "graph_"+Math.random();
canvas.width  = 512;
canvas.height = 512;
canvas.style.display   = "none";
var body = document.getElementsByTagName("body")[0];
body.appendChild(canvas);

var canvImage = document.getElementById(canvas.id);
var ctx = canvImage.getContext('2d');

inWidth.onChange=inHeight.onChange=function()
{
   canvas.width  = inWidth.get();
    canvas.height = inHeight.get();
}

var buff=[];

var maxValue=-Number.MAX_VALUE;
var minValue=Number.MAX_VALUE;
var colors=[];
var lastTime=Date.now();

value.onLinkChanged=reset;
index.onLinkChanged=reset;
inReset.onTriggered=reset;

value.onChange=function()
{
    addValue(value.get(),Math.round(index.get()));
};

trigger.onTriggered=function()
{
    for(var i=0;i<buff.length;i++)
        if(buff[i]) addValue(buff[i][ buff[i].length-1 ],i);

    updateGraph();
};

function reset()
{
    buff.length=0;
    maxValue=-999999;
    minValue=999999;
}

function addValue(val,currentIndex)
{
    maxValue=Math.max(maxValue,parseFloat(val));
    minValue=Math.min(minValue,parseFloat(val));

    if(!buff[currentIndex])
    {
        buff[currentIndex]=[];
        Math.randomSeed=inSeed.get()+currentIndex;

        colors[currentIndex] = 'rgba('+Math.round(Math.seededRandom()*255)+','+Math.round(Math.seededRandom()*255)+','+Math.round(Math.seededRandom()*255)+',1)';
    }

    var buf=buff[currentIndex];
    buf.push(val);

    if(!trigger.isLinked())if(Date.now()-lastTime>30)updateGraph();
}

function updateGraph()
{
    function getPos(v)
    {
        return canvas.height-( (v/h*canvas.height/2*0.9)+canvas.height/2 );
    }

    ctx.fillStyle="#000";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.fillStyle="#444";
    ctx.fillRect(0,getPos(0),canvas.width,1);

    for(var b=0;b<buff.length;b++)
    {
        var buf=buff[b];
        if(!buf)continue;

        ctx.lineWidth = 2;

        var h=Math.max(Math.abs(maxValue),Math.abs(minValue));
        var heightmul=canvas.height/h;
        var start=Math.max(0,buf.length-canvas.width);

        ctx.beginPath();
        ctx.strokeStyle=colors[b];

        ctx.moveTo(0,getPos(buf[start]));

        for(var i=start;i<buf.length;i++)
        {
            ctx.lineTo(
                1+i-start,
                getPos(buf[i]));

        }
        ctx.stroke();
    }

    ctx.font = "22px monospace";

    if(inShowMinMax.get())
    {
        ctx.fillStyle="#fff";
        ctx.fillText('max:'+(Math.round(maxValue*100)/100), 10, canvas.height-10);
        ctx.fillText('min:'+(Math.round(minValue*100)/100), 10, canvas.height-30);
    }


    if(texOut.get()) texOut.get().initTexture(canvImage);
        else texOut.set( new CGL.Texture.createFromImage(cgl,canvImage,
        {
            "filter":CGL.Texture.FILTER_MIPMAP

        }) );

    lastTime=Date.now();
}

