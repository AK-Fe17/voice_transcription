class SummarizationService
  require 'httparty'

  BASE_URL = 'https://api.openai.com/v1/chat/completions'
  
  def initialize
    @api_key = ENV['OPENAI_API']
  end
  
  def summarize(text)
    return "" if text.blank?

    return fallback_summary(text) if @api_key.blank?

    response = HTTParty.post(
      BASE_URL,
      headers: {
        'Authorization' => "Bearer #{@api_key}",
        'Content-Type' => 'application/json'
      },
      body: {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes conversations. Provide a concise summary highlighting key points, decisions, and action items.'
          },
          {
            role: 'user',
            content: "Please summarize this conversation:\n\n#{text}"
          }
        ],
        # temperature: 0.7,
        max_tokens: 500
      }.to_json
    )

    Rails.logger.info("OpenAI Response Code: #{response.code}")
    Rails.logger.info("OpenAI Body: #{response.body}")


    if response.success?
      response.parsed_response.dig('choices', 0, 'message', 'content') || fallback_summary(text)
    else
      Rails.logger.error "OpenAI API error: #{response.code} - #{response.body}"
      fallback_summary(text)
    end
  end

  private

  def fallback_summary(text)
    text.split(/(?<=[.?!])\s+/)[0, 3].join(' ')
  end
end