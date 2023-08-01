import GPTService from '../services/gptService.js';

class AskController {
  static async ask(req, res) {
    // Validate request body here and process 
    const gptService = new GPTService();
    const generator = gptService.getResponses(req.body.text);
    for await (const response of generator) {
      res.write(response);
    }
    res.end();
  }
}

export default AskController;