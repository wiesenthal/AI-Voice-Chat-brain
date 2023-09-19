import { createParser } from 'eventsource-parser';
import { MODEL } from '../configuration/environment.js';
import { request } from 'https';
import { openAIRequestConfig } from '../configuration/openaiRequestConfig.js';

export async function* getResponseFromOpenAI(formattedContext) {

    let resolveNext;  // Function to resolve the next promise
    const promises = [new Promise(resolve => resolveNext = resolve)];
    
    const reqHttps = request(openAIRequestConfig, (response) => {
      const parser = createParser((event) => {
          if (event.type === 'event') {
              if (event.data !== "[DONE]") {
                  const txt = JSON.parse(event.data).choices[0].delta?.content || "" + "\n";
                  console.log(`Received word from GPT: ${txt}`);
                  resolveNext(txt);  // Resolve the current promise with the chunk
                  promises.push(new Promise(resolve => resolveNext = resolve));
              }
              else {
                  resolveNext(null);  // Resolve the current promise with null
                  promises.push(new Promise(resolve => resolveNext = resolve));
              }
          } else if (event.type === 'done') {
            // I don't think this is ever called
              console.log('Received done event');
              resolveNext(null);  // Resolve the current promise with null
              promises.push(new Promise(resolve => resolveNext = resolve));
          } else {
              console.log(`Received unknown event: ${event}`);
          }
      });
  
      response.on('data', (data) => {
          // above fails if the response is not JSON, make it safe
          if (data.toString().replace(/\s+/g,'').startsWith('{"error"')) {
              console.error(`Received error from GPT: ${data.toString()}`);
              resolveNext(null);  // Resolve the current promise with null
              promises.push(new Promise(resolve => resolveNext = resolve));
              return;
          }
  
          parser.feed(data.toString());
      });
  
      response.on('end', () => {
          parser.reset();
          console.log('No more data in response.')
      });
    });
  
    reqHttps.on('error', (error) => {
        console.error(error);
    });
  
    reqHttps.write(JSON.stringify({
        model: MODEL,
        messages: formattedContext,
        stream: true,
        n: 1,
    }));
    reqHttps.end();
  
    try {
      for (let promise of promises) {
        yield await promise;
      }
      } finally {
      reqHttps.destroy();
    }
  }