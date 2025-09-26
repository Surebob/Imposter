Edwin,

I love this. By far the most in-depth, well written fallout game (as well as the terminal, but I found it looking for the fallout game) I've seen yet. The fact that it's in such an amazing package of the terminal with scanlines, typing, other command framework. It's great.

I'd like to use this for our airsoft events that we host (you read that right) and would like to know how to properly attribute you. I also have a question about why / how to fix - in the fallout game, when the typer is updating the lives (updateLives()) and you move the cursor it cancels the typer and can sometimes mess up the ending of the game (assuming waiting for a promise that gets wonkey?)

If you're willing, let me know your thoughts on the typer, but please let me know how to best give you credit to our players.


2
 likes
Like

Reply
 
 
ekeijl profile image
Edwin 
•
Nov 7 '20

Hey, thanks man! I'm really happy to hear that other people use my code for all kinds of stuff! I have not really thought about how to give credit, maybe just link to my dev.to profile for now. I was working on a portfolio site, this might be the motivation to actually finish it. :)

About the updateLives function, I assume you want to wait for the updateLives function to finish before doing the next thing. I see that this function does not return anything, that may cause the issue?

async function updateLives() {
    let span = document.querySelector(".lives");

    let blocks = Array(lives)
        .fill(0)
        .map(() => "■ ")
        .join("");

        // Added return here
    return await type("Text", { clearContainer: true }, span);
  }
Then you can wait for the function to finish by using async/await:

async function doStuff() {

  //...
  await updateLIves();
  // should wait for updateLives to finish

1
 like
Like

Reply
 
 
maveric profile image
maveric
•
Jun 17 '21

I'm not sure if you are still reading comments on this article but we had our airsoft event last month and these were a HIT. I loaded it up on some rPi's and battery packs with wifi that redirected all traffic to the pi.

I built a local backend API that took in the "command" and tested it against our list and sent back either brogue or fallout to run based on our new command names. Then hooked into the win/losses and sent that back to the api so we could have dynamic win/loss messages based on the game that was played. It added something completely new to the airsoft world and we will absolutely be bringing it back in future games.


3
 likes
Like
Thread
 
ekeijl profile image
Edwin 
•
Jun 18 '21

That's so cool! I picture this as a "retro arcade" that you use during the downtime of the airsoft event? Thanks for the update!


1
 like
Like
Thread
 
maveric profile image
maveric
•
Jun 18 '21

Nope. :P We've got the pi's people connect with with their phone and a few toughbooks they've got to be in front of. You've got to have people pull security (to keep enemies away) or play the game under fire in order to get the information out of it to complete your mission and keep things progressing. The "hacking terminal" is very much a part of the live fire scenario game.


2
 likes
Like
Thread
 
ekeijl profile image
Edwin 
•
Jun 18 '21

That is freakin' genius! Sort of "hacking" mini-games during the event, that's so creative! Reminds me of this "scavenger hunt" game that we used to play on my university campus.

I'm currently playing a game called "Control" which also has some terminal based mini-games, might add it to this project. (no promises tho)


1
 like
Like

Reply
 
 
maveric profile image
maveric
•
Nov 7 '20 • Edited on Nov 7

I've made that change, and the execution does not seem to change. I have a "console.log" immediately following the call to updateLives that in fact will not show until it completes. But if I move the mouse, the

wordSpan.addEventListener("mouseenter", handleWordHover);

gets called (as it's on all elements) and seems to interrupt the promise. If I move the mouse, I never get that console.log statement for that call. If that game ends with that interrupted, it won't show the game end typer properly.

I have not been able to find any resources on this type of interaction - an event listener popping off during an await that messes it up - and this whole async/await was not a paradigm when I was coding last. Trying to catch up.

Your help/suggestions would be greatly appreciated but I know this was just a side/learning project, not something you intended to support and won't be offended if you chose not to.


1
 like
Like
Thread
 
ekeijl profile image
Edwin 
•
Nov 7 '20

If I could look at the code somehow I can help debugging. Can you put it online somewhere like a codesandbox?


2
 likes
Like
Thread
 
maveric profile image
maveric
•
Nov 7 '20 • Edited on Nov 7

The sandbox is at:
codesandbox.io/s/hungry-booth-wyl1...
It really is just your code that I've made some minor bug fixes and personal debug/figure out code to. The same thing happens on the sandbox from this write up as well if it's easier to look at code I haven't put any hack-it-to-figure-it-out code into.


2
 likes
Like
Thread
 
ekeijl profile image
Edwin 
•
Nov 8 '20 • Edited on Nov 8

Oh, it was easier than I thought.

I defined the interval variable at the top of the io.js module. Everytime you call type() it will overwrite the interval. I use setInterval to process the queue of characters one by one. So if type() is called while another is still running, only the last one will finish.

Moving the interval variable inside the type() function ensures every promise will execute asynchronously like you expect. Not sure why I wrote it like this in the first place, probably because I thought I would only need 1 typer at the same time, lol.


3
 likes
Like
Thread
 
maveric profile image
maveric
•
Nov 8 '20

That's fantastic. I'm very glad it was an easy find for you and greatly appreciate you looking into it for me. Works like a charm. That would have taken me ages to find, as I was going down the "how's the promise getting messed up" path.

I've got a lot to learn, but you've got great code for me to follow, so thanks again.


1
 like
Like

Reply
 
 
chafalleiro profile image
Chafalleiro
•
Aug 5 '22

Hello I borrowed your code, also added some SVG effect to do a barrel distortion of the screen that you can find interesting. Credited in the credits menu, I hope the crediting is correct.

chafalleiro.github.io/retromator/v...


3
 likes
Like

Reply
 
 
ekeijl profile image
Edwin 
•
Aug 5 '22

This looks perfect! 🤩


2
 likes
Like

Reply
 
 
chafalleiro profile image
Chafalleiro
•
Aug 6 '22

Thank you very much :) Certainly you post helped me a lot.


1
 like
Like

Reply
 
 
fhgaha profile image
fhgaha
•
Feb 21 '23 • Edited on Feb 23

im trying to repeat. almost done but cant find what "sphere_wide_1.png" look like


1
 like
Like

Reply
 
 
sungbinlee profile image
Sungbin Lee
•
Jun 15 '23

Hey Edwin, Just wanted to say a big thank you for your amazing article. Thanks for sharing your knowledge. It's been a huge inspiration for my project! github.com/sungbinlee/TicTacToeWit...


2
 likes
Like

Reply
 
 
ekeijl profile image
Edwin 
•
Jun 15 '23

Hello Sungbin Lee, that's a cool project, glad I could be of help! :D


2
 likes
Like

Reply
 
 
hbaguette profile image
H-Baguette
•
Jan 2 '21

Hey! I'm trying to use this code to make a small terminal for a game, but... for whatever reason, it's saying the :after elements are invalid names, and thus none of it shows up. I'm also having an issue of my scanlines appearing over my border image.


1
 like
Like

Reply
 
 
ekeijl profile image
Edwin 
•
Jan 2 '21

Can you show me the code somehow? Codesandbox or github? I'm not sure what you mean.


2
 likes
Like

Reply
 
 
hbaguette profile image
H-Baguette
•
Jan 3 '21

I managed to fix most of those issues, plus a few more I was having after adapting it for my own purposes, but I'm still having the issue with the scanlines appearing over the corners of the border image. The code's probably gonna look confusing and spaghettified to all hell, but I can add you to the Github repo, if you want to take a look.


1
 like
Like

Reply
 
 
rizpng profile image
RIZ
•
Jul 21 '23

Hey Edwin,

I'd like to say i love the way you designed your terminal and I'm glad it's being used to help other people. I was just wondering if it's possible to convert the terminal into a text editor tool instead given that I cannot freely text as i receive "unknown command" error whenever i type.

I'm not tech saavy at all so I'm unsure how to utilise Sandbox or any of the other tools used to code. Any feedback would be greatly appreciated

Image description


Like

Reply
 
 
ekeijl profile image
Edwin 
•
Jul 24 '23

Hey RIZ, I made a new command text-editor command, it saves what you typed in your browser.

tlijm.csb.app/?command=text-editor


1
 like
Like

Reply
 
 
rizpng profile image
RIZ
•
Jul 27 '23

yeah, i've been playing around with it and it works perfectly. i appreciate the support edwin and will continue to follow and support your work.
have a nice one mate :)


1
 like
Like

Reply
 
 
doug_davison_2f87696dcf3d profile image
Doug Davison
•
Jul 16 '23

It would be cool to use this to build various screens for use during an RPG session. I could see a need for building a custom intro screen for each terminal's welcome screen and login, and then menu items that do various things or open log journal records.

Shut off exterior turrets (admin only)
Open valve in backup tank
Read Journal Entries
Hack system to gain admin rights

1
 like
Like

Reply
 
 
fossheim profile image
Sarah
•
Feb 21 '20

Really love this! 😍


2
 likes
Like

Reply
 
 
zcysxy profile image
Chenyu ZHANG
•
Nov 14 '21

Great article! I can easily follow all the steps. There's only one thing that is I couldn't find the bezel.png, am I missing something?


1
 like
Like

Reply
 
 
zcysxy profile image
Chenyu ZHANG
•
Nov 14 '21

Oh I found it in the codesandbox! How can I miss that. Thanks!


2
 likes
Like

Reply
 
 
fritzvd profile image
Fritz van Deventer
•
Oct 27 '20 • Edited on Oct 27

This is awesome. Thanks for sharing. I totally stole everything from here to create my birthday “invite”: fritzvd.com/33/


2
 likes
Like

Reply
 
 
ekeijl profile image
Edwin 
•
Oct 27 '20

Nice!


1
 like
Like

Reply
 
 
fradar profile image
FRADAR
•
Jun 20 '21

I just love this.


1
 like
Like

Reply
 
 
wordpressure profile image
TricaExMachina
•
May 18 '22

This is gorgeous, what great work.


Like

Reply
 
 
junipersaroj profile image
juniperSaroj
•
Nov 4 '22

how can i log in it is asking for the password and username
i need to use this for some video editing process guess ... please help bro.


1
 like
Like

Reply
 
 
ekeijl profile image
Edwin 
•
Nov 7 '22

Just use "admin" for both username and password, it's in the source code 😆


2
 likes
Like

Reply
 
 
dipto_bhowmik profile image
Dipto Bhowmik
•
Apr 26

I am just amazed. Just amazing


1
 like
Like

Reply
 
 
bartydash profile image
BartyDash
•
Oct 22 '23

Great job! It's awesome 😍🤯