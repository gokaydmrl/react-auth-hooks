type EventHandler<Evt extends Event> = (e: Evt) => void | Promise<void>;

interface Settings {
  url: string;
  requestInit: RequestInit;
  reconnectionTime: number;
}

export class AppEventSource extends EventTarget {
  #readyState: 0 | 1 | 2 = 0;
  CONNECTING = 0 as const;
  OPEN = 1 as const;
  CLOSED = 2 as const;

  #settings: Settings;

  onopen: EventHandler<Event> | null = null;
  onmessage: EventHandler<MessageEvent<string>> | null = null;
  onerror: EventHandler<Event> | null = null;
  oncomplete: EventHandler<Event> | null = null;

  constructor(url: string, requestInit: RequestInit = {}) {
    super();

    this.#settings = {
      url,
      requestInit,
      reconnectionTime: 2200,
    };

    this.#fetch();
  }

  get readyState() {
    return this.#readyState;
  }

  get url() {
    return this.#settings.url;
  }

  close() {
    this.#readyState = this.CLOSED;
  }

  async #fetch() {
    let currentRetries = 0;
    while (this.#readyState < this.CLOSED) {
      const res = await fetch(
        this.url,
        Object.assign(
          { cache: "no-store", keepalive: true, redirect: "follow" },
          this.#settings.requestInit
        )
      ).catch(() => void 0);

      if (res?.body && res.status === 200) {
        // Announce connection
        if (this.#readyState !== this.CLOSED) {
          this.#readyState = this.OPEN;
          const openEvent = new Event("open", {
            bubbles: false,
            cancelable: false,
          });
          super.dispatchEvent(openEvent);
          if (this.onopen) {
            this.onopen(openEvent);
          }
        }

        // Decode body for interpreting
        const decoder = new TextDecoderStream("utf-8", {
          ignoreBOM: false,
          fatal: false,
        });

        const reader = res.body.pipeThrough(decoder).getReader();

        // Initiate buffers
        let readBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            this.#readyState = this.CLOSED;
            const closeEvent = new Event("close", {
              bubbles: false,
              cancelable: false,
            });
            super.dispatchEvent(closeEvent);
            if (this.oncomplete) {
              this.oncomplete(closeEvent);
            }
            break;
          }

          const lines = decodeURIComponent(readBuffer + value)
            .replace("\r\n", "\n")
            .replace("\r", "\n")
            .split("\n");
          readBuffer = lines.pop() ?? "";

          // Start loop for interpreting
          for (const line of lines) {
            if (!line) {
              continue;
            }

            // Ignore comments
            if (line[0] === ":") {
              continue;
            }

            let splitIndex = line.indexOf(":");
            splitIndex = splitIndex > 0 ? splitIndex : line.length;
            const field = line.slice(0, splitIndex).trimEnd();
            const data = line.slice(splitIndex + 1).trimEnd();
            switch (field) {
              case "event":
                break;
              case "data":
                if (this.onmessage) {
                  this.onmessage(
                    new MessageEvent<string>("data", {
                      data,
                      cancelable: false,
                      bubbles: false,
                    })
                  );
                }
                break;
              case "retry": {
                // set reconnectionTime to Field Value if int
                const num = Number(data);
                if (!isNaN(num) && isFinite(num)) {
                  this.#settings.reconnectionTime = num;
                }
                break;
              }
            }
          }
        }
      } else {
        // Connection failed for whatever reason
        this.#readyState = this.CLOSED;
        const errorEvent = new Event("error", {
          bubbles: false,
          cancelable: false,
        });
        super.dispatchEvent(errorEvent);
        if (this.onerror) {
          this.onerror(errorEvent);
        }
        if (currentRetries >= 3) {
          break;
        }
        currentRetries++;
      }

      // Set readyState to CONNECTING
      if (this.#readyState !== this.CLOSED) {
        this.#readyState = this.CONNECTING;

        // Fire onerror
        const errorEvent = new Event("error", {
          bubbles: false,
          cancelable: false,
        });

        super.dispatchEvent(errorEvent);
        if (this.onerror) {
          this.onerror(errorEvent);
        }

        // Timeout for re-establishing the connection
        await new Promise<void>((res) => {
          const id = setTimeout(
            () => res(clearTimeout(id)),
            this.#settings.reconnectionTime
          );
        });

        if (this.#readyState !== this.CONNECTING) {
          break;
        }
      }
    }
  }
}
