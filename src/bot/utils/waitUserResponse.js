export function waitUserResponse() {
    return new Promise(resolve => {
        bot.once('message', (responseMessage) => {
            resolve(responseMessage.text);
        });
    });
}