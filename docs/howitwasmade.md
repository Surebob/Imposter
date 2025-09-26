Retro CRT terminal screen in CSS + JS
#
css
#
javascript
#
crt
#
showdev
As a fun project, I decided to create a terminal interface that has the look and feel of an old CRT monitor.

The terminal is responsive, but it might be easier to work with on a larger screen (and it will provide a hint for the login).

Now, it's time to boot that terminal!



Goals
My goal is to build the whole thing using modern ECMAScript 6 features (without any transpiler such as Babel). Sorry Internet Explorer, it's time for you to retire.

During this project, I learned about a lot of topics:

ES6 features such as modules, dynamic import and async/await
CSS border-image, background gradients, animation and variables
JavaScript Audio and SpeechSynthesis APIs
Handling DOM elements using pure JS
There is too much going on to do a full tutorial, but in this article I'll explain the most important parts. Later on, I might do a follow up article about the details, such as individual components and how I organized the project. In the examples I often leave out some of the final code for clarity, but you can always view the source on Codesandbox.

Inspiration
I drew most of my inspiration for this project from the Fallout 3 game, where you can "hack" your way into computers by playing a mini game on one of these terminals:



Skeuomorphisms
Mimicing attributes of real life objects (such as the material or shape) in a design is called a skeuomorphism. The reasoning is that by making a design look like an object that the user is familiar with, it might become easier to understand. Apple used it a lot in their apps, such as the book store apps that showed your books on a 'real' shelf or a compass app that showed a spinning compass pointing to the direction you are facing.

This style has fallen in to disuse mostly due to the popularity of flat design, where extreme minimalism seems to be the norm. Most software still contains some skeuomorphisms though. For example, the simple unstyled HTML <button> on a webpage will resemble a hardware button, which should give the user a clue that this element can be pressed. Navigational tabs look like a physical tabbed folder.

Another great example that I recently encountered is this polaroid camera:

fossheim 
📸✨ Polaroid Camera In CSS
Sarah ・ Jan 31 '20
#codepen #css #html
Coding a CRT
So how do we make our CRT resemble the real deal? We're gonna need a few parts:

Scanlines, the visual pattern of alternating horizontal lines that this type of monitor used to have.
A huge rounded bezel, to make it look like one of those tiny portable TV sets.
Some buttons, such as a power switch. I feel that manually switching on the device and actually seeing the device boot increases the immersion of the whole experience.
A text based interface where the user can type in commands.
Building the screen 📺
The basic HTML is pretty simple, it's just a <div> for each part:

<!-- the actual device -->
<div id="monitor">
    <!-- the rounded edge near the glass -->
    <div id="bezel">
        <!-- the overlay and horizontal pattern -->
        <div id="crt" class="off" onClick="handleClick(event)"> 
            <!-- slowly moving scanline -->
            <div class="scanline"></div>
            <!-- the input and output -->
            <div class="terminal"></div>
        </div>
    </div>
</div>
I might cover the button controls in a future article.

The scanlines
The horizontal black and semi-transparent lines from this Codepen seemed to do the trick:

#crt:before {
    content: " ";
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    background: linear-gradient(
        to bottom,
        rgba(18, 16, 16, 0) 50%,
        rgba(0, 0, 0, 0.25) 50%
    );
    background-size: 100% 8px;
    z-index: 2;
    pointer-events: none;
}

The :before pseudo class, combined with position: absolute, allows us to overlay the line pattern on top of the element. The linear-gradient fills the background for the top half with an opaque dark line and the bottom half with a semi-transparent black. The background-size property makes it full width and 8px high, so each individual line becomes 4px. This background is repeated vertically to create the alternating line pattern.

This article describes a way to create a really realistic scanline pattern, which even includes a screen door effect: a mesh-like appearance where you can see the gaps between pixels on the screen. This causes the screen to really flicker, which was very straining on my eyes, so I decided not to use that. I did use the color separation effect for the text, which adds an animated text-shadow to the terminal text which makes the text appear to move around a bit:

@keyframes textShadow {
  0% {
    text-shadow: 0.4389924193300864px 0 1px rgba(0,30,255,0.5), -0.4389924193300864px 0 1px rgba(255,0,80,0.3), 0 0 3px;
  }
  5% {
    text-shadow: 2.7928974010788217px 0 1px rgba(0,30,255,0.5), -2.7928974010788217px 0 1px rgba(255,0,80,0.3), 0 0 3px;
  }
  /** etc */
}
Then there is also a scanline moving over the screen from top to bottom every ten seconds. It uses a similar, but larger linear-gradient and an animation to make it move from top to bottom.

.scanline {
    width: 100%;
    height: 100px;
    z-index: 8;
    background: linear-gradient(
        0deg,
        rgba(0, 0, 0, 0) 0%,
        rgba(255, 255, 255, 0.2) 10%,
        rgba(0, 0, 0, 0.1) 100%
    );
    opacity: 0.1;
    position: absolute;
    bottom: 100%;
    animation: scanline 10s linear infinite;
}
The animation is out of view for 80% of the time and moves from top to bottom in the remaining 20%:

@keyframes scanline {
    0% {
        bottom: 100%;
    }
    80% {
        bottom: 100%;
    }
    100% {
        bottom: 0%;
    }
}
The bezel 🖵
To create the rounded edge, I use a border-image, a CSS property that I have never even heard of before! The idea is that you create a background image that is sliced up automatically into several regions, one for each edge and corner.

Bezel

You can indicate how much of the image is actually used by the unitless border-image-slice property. It uses the value as pixels for raster images and as percentage for SVG. In our case, we want 30px from the edge. Defining the border: 30px solid transparent property seemed necessary to make it look OK in Android Chrome.

#screen {
    position: relative;
    width: 100%;
    height: 67.5vmin;
    border: 30px solid transparent;
    border-image-source: url(./bezel.png);
    border-image-slice: 30 fill;
    border-image-outset: 0;
    overflow: hidden;
}
Your browser will then automagically use the border image and scale the middle sections for varying width and height of the element. ✨

Screens
To create an experience where the user can interact with the terminal and have some screens where all the output is automatic and others where there is alternating input/output, I created one function for each of the screens:

boot - the start-up sequence
login - a very secure authentication mechanism
main - where the user can type commands
Boot
The boot screen just outputs a lot of text on the screen. To achieve this, I created a type() function, which returns a promise that resolves when the typing animation is finished. It is crucial to make it an asynchronous function, because we want to wait for the typing animation to complete before we let the user type his input. How the function works is explained further below.

In all of my functions, I use a simple async/await pattern that is shown here, so I can build my screens in a synchronous flow, which keeps the code very readable.

In the boot() function, I can then just await the typer() function to finish and move to the next screen:

async function boot() {
    clear();
    await typer("Hello world");

    login();
}
The clear() function just empties the terminal div by resetting the innerHTML. I will skip the login screen for now and explain the main loop.

Main
The main() function shows the input and waits for the user to type a command. The command is then parsed and based on a lot of if/else statements, we can call a function and/or show some output to the user. When the command has finished, we start over by recursively calling the main() function!

async function main() {
    let command = await input();
    await parse(command);

    main();
}
I just love how concise and readable this code is, despite the fact that we are using an imperative style of programming. Creating and updating DOM elements manually is a bit of a chore, but quite manageable in our case.

Input/output ⌨️
The CSS for the input and output text is pretty simple, the only interesting thing to mention is the pixely VT323 font and all text is transformed to uppercase:

@import url("https://fonts.googleapis.com/css?family=VT323&display=swap");

.terminal {
    font-family: "VT323", monospace;
    text-transform: uppercase;
}
Animated typing for the output
This is the part where most of the JavaScript stuff comes in. I started out using a library called TypeIt to create an animated typing effect for the command line output. It's quite versatile - you can just pass it a container element and an array of strings and off it goes!

new TypeIt('#container', {
    strings: ["Hello", "world"],
    speed: 50,
    lifeLike: true,
    startDelay: 0,
    cursorChar: "■"
}).go();
After a while I decided to roll my own typing function, because I wanted to add a fancy animation when characters appeared on the screen (try clicking the red button). The core of this functionality is a while loop that adds one character to the screen and then pauses for a short while:

async function type(text, container) {

    await pause(1);

    let queue = text.split("");

    while (queue.length) {
        let char = queue.shift();
        container.appendChild(char);
        await pause(0.05);
    }

    await pause(0.5);
    container.classList.remove("active");
    return;
}
The while loop keeps running as long as the queue string has length > 0 and the String.shift() function removes the first character and returns it.

The pause function is a glorified wrapper for setTimeout(), returning a Promise so we can wait for it using async/await - nifty! Usually you want to postpone executing a callback function using setTimeout, but here we just want to pause the code execution, to simulate the terminal processing your command. Thanks Stackoverflow.

function pause(s = 1) {
    return new Promise(resolve => setTimeout(resolve, 1000 * Number(s)));
}
One second is the default argument, because that is how I wanted to use it most of the time.

Handling input commands
In a very similar fashion, I let the user type a command by creating an input element that returns a resolved promise when the user presses the enter key.

async function input(pw) {
    return new Promise(resolve => {
        const onKeyDown = event => {
            if (event.keyCode === 13) {
                event.preventDefault();
                let result = event.target.textContent;
                resolve(result);
            }
        };

        let terminal = document.querySelector(".terminal");
        let input = document.createElement("div");
        input.setAttribute("id", "input");
        input.setAttribute("contenteditable", true);
        input.addEventListener("keydown", onKeyDown);
        terminal.appendChild(input);
        input.focus();
    });
}
The input is actually a <div> with the contenteditable attribute property, which allows the user to type inside the element. This may come in handy if we want to do fancy HTML stuff inside the div, which is mostly not allowed inside a regular <input> element.

The blinking caret 🟩
The blinking square at the end of a line really adds to the whole typing animation (credits to TypeIt for the inspiration). It is nothing more than a character placed in the :after pseudo class!

#input {
    position: relative;
    caret-color: transparent;
}
/* Puts a blinking square after the content as replacement for caret */
#input[contenteditable="true"]:after {
    content: "■";
    animation: cursor 1s infinite;
    animation-timing-function: step-end;
    margin-left: 1px;
}
/* Inserts the > before terminal input */
#input:before {
    content: ">";
    position: absolute;
    padding-left: 1.5rem;
    left: 0;
}
The animation-timing-function: step-end makes the cursor change its transparency discretely to make it blink, rather than as a linear fade.

Then I also place a > character before the input to indicate that he user can type there. A neat little trick is settings caret-color: transparent; on the actual element itself, to hide the default caret. This will break moving the cursor if the user clicks in the middle of the text, but it does not bother me all too much.

Executing commands
I started off with a large if/else block to handle all the different commands, but that got out of hand quickly, so I needed something more modular.

This is where I decided to use dynamic imports. Another ES6 feature that has great browser support, now that Chromium version of Edge is released!

You probably know static imports, where you import your dependencies at the top of your own module:

import moment from 'moment'
A dynamic import can be used anywhere, even conditionally, with variable paths and will require the specified resource on demand! Just what we need! The import will return a Promise with your module. If you use async/await, you can access any of its exports directly:

const { format } = await import('date-fns');
So here is how I used imports in for parsing commands:

async function parse(command) {

    let module;

    // Try to import the command function
    try {
        module = await import(`../commands/${command}.js`);
    } catch (e) {
        console.error(e);
        return await type("Unknown command");
    }

    // Type the output if the command exports any
    if (module && module.output) {
        await type(module.output);
    }

    await pause();

    // Execute and wait for the command (default export) to finish
    if (module.default) {
        await module.default();
    }
    return;
}
Doing this kind of stuff directly in the browser without any transpiler such as Babel and a code bundler like Webpack is very cutting-edge. It gives the developer a lot of freedom to only load resources whenever they are needed, preventing your main app from getting bloated. This is one of the main features that will make it easy to write modular, lightweight apps in native JavaScript.

Commands 👨‍💻
Every command is simply a JavaScript module with a default export function that is executed when it is loaded. It can also directly output some text when the user presses enter by adding an output named export, as explained above. If we return a Promise here, the main() function will wait for the command to be finished.

const output = "Hello world.";

const helloWorld = () => {
   // do whatever...
};

export { output };

export default helloWorld;
Now that we can add commands in a modular way, we can go completely crazy and write any cool stuff we can think of.

I'm trying to free your mind, Neo. But I can only show you the door. You're the one that has to walk through it.

-- Morpheus

GIFMatrix

Next time...
In the next part of this article, I will explain more about how I added sound, control buttons and theming! For now, have fun hacking!