#!/bin/sh
// 2>/dev/null;DENO_VERSION_RANGE="^1.39.1";DENO_RUN_ARGS="--allow-write=./sock --allow-read=./sock --allow-run=lsof";set -e;V="$DENO_VERSION_RANGE";A="$DENO_RUN_ARGS";h(){ [ -x "$(command -v $1 2>&1)" ];};g(){ u="$([ $(id -u) != 0 ]&&echo sudo||:)";if h brew;then echo "brew install $1";elif h apt;then echo "($u apt update && $u DEBIAN_FRONTEND=noninteractive apt install -y $1)";elif h yum;then echo "$u yum install -y $1";elif h pacman;then echo "$u pacman -yS --noconfirm $1";elif h opkg-install;then echo "$u opkg-install $1";fi;};p(){ q="$(g $1)";if [ -z "$q" ];then echo "Please install '$1' manually, then try again.">&2;exit 1;fi;eval "o=\"\$(set +o)\";set -x;$q;set +x;eval \"\$o\"">&2;};f(){ h "$1"||p "$1";};U="$(printf "%s" "$V"|xxd -p|tr -d '\n'|sed 's/\(..\)/%\1/g')";D="$(command -v deno||true)";t(){ d="$(mktemp)";rm "${d}";dirname "${d}";};a(){ [ -n $D ];};s(){ a&&[ -x "$R/deno" ]&&[ "$R/deno" = "$D" ]&&return;deno eval "import{satisfies as e}from'https://deno.land/x/semver@v1.4.1/mod.ts';Deno.exit(e(Deno.version.deno,'$V')?0:1);">/dev/null 2>&1;};e(){ R="$(t)/deno-range-$V/bin";mkdir -p "$R";export PATH="$R:$PATH";[ -x "$R/deno" ]&&return;a&&s&&([ -L "$R/deno" ]||ln -s "$D" "$R/deno")&&return;f curl;v="$(curl -sSfL "https://semver-version.deno.dev/api/github/denoland/deno/$U")";i="$(t)/deno-$v";[ -L "$R/deno" ]||ln -s "$i/bin/deno" "$R/deno";s && return;f unzip;([ "${A#*-q}" != "$A" ]&&exec 2>/dev/null;curl -fsSL https://deno.land/install.sh|DENO_INSTALL="$i" sh -s $DENO_INSTALL_ARGS "$v">&2);};e;exec "$R/deno" run $A "$0" "$@"

import { run } from "https://deno.land/x/run_simple@2.2.0/mod.ts";

async function listen() {
  console.error("Starting listener");
  using listener = Deno.listen({ transport: "unix", "path": "./sock" });
  try {
    for await (const conn of listener) {
      void handleConnection(conn);
    }
    console.error("Done listening");
  } finally {
    console.error("Closing listener");
    listener.close();
    console.error("Closed listener");
  }
  console.error("listen function done");
}

function greet(conn: Deno.Conn, nick: string) {
  conn.write(
    new TextEncoder().encode(`Hello, ${nick}!\n`),
  );
}

async function handleConnection(conn: Deno.Conn) {
  let nick = `conn-${conn.rid}`;
  try {
    console.error(`${nick}: Handling connection`);
    greet(conn, nick);

    console.error(`${nick}: Reading from connection`);
    for await (const buf of conn.readable) {
      const line = new TextDecoder().decode(buf).replace(/\n$/, "");
      console.log(`${nick}: ` + line);
      if (line.startsWith("/nick ")) {
        const newNick = line.slice("/nick ".length);
        conn.write(
          new TextEncoder().encode(
            `You will henceforth be known as ${newNick}\n`,
          ),
        );
        console.error(`${nick}: Nick set to ${newNick}`);
        nick = newNick;
      }
      if (line === "/quit") {
        console.error(`${nick}: Quitting`);
        conn.write(new TextEncoder().encode("Goodbye!\n"));
        conn.close();
        console.error(`${nick}: Quit`);
        break;
      }
      if (line === "/error") {
        console.error(`${nick}: Throwing error`);
        throw new Error(`${nick} asked for it`);
      }
      if (line === "/greet") {
        console.error(`${nick}: Greeting`);
        greet(conn, nick);
      }
      if (line === "/help") {
        console.error(`${nick}: Helping`);
        conn.write(
          new TextEncoder().encode(
            `Commands:
/nick <nick> - set your nick
/quit        - quit
/error       - throw an error
/greet       - greet again
/help        - show this help
`,
          ),
        );
      }
    }
  } catch (e) {
    console.error(`${nick}: Caught error`, e);
  }
  console.error(`${nick}: Done handling connection`);
}

try {
  await listen();
} catch (e) {
  console.error("Caught error", e);
  if (e instanceof Deno.errors.AddrInUse) {
    console.error('"Address in use", checking if socket is really in use');
    if (await resolves(run(["lsof", "./sock"]))) {
      console.error("Socket is really in use, re-throwing error");
      throw e;
    }
    console.error("Socket is not really in use, removing and trying again");
    await Deno.remove("./sock");
    console.error("Removed socket, trying again");
    await listen();
    console.error("After trying again");
  } else {
    console.error('Not an "Address in use" error, re-throwing');
    throw e;
  }
}
console.error("After main try/catch");

async function resolves(promise: Promise<unknown>) {
  try {
    await promise;
    return true;
  } catch (_e) {
    return false;
  }
}
