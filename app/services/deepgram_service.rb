class DeepgramService
  require 'httparty'

  BASE_URL = 'https://api.deepgram.com/v1/listen'

  def initialize
    @api_key = ENV['DEEPGRAM_API']
  end

  def transcribe_audio(temp_file, content_type)
    audio_data = File.read(temp_file.path, mode: 'rb')

    response = HTTParty.post(
      BASE_URL,
      headers: {
        'Authorization'=> "Token #{@api_key}",
        'Content-type'=> content_type
      },
      body: audio_data,
      query: { punctuate: true, diarize: true, utterances: true, smart_format: true }
    )

    if response.code == 200
      data = parse_response(response.parsed_response)
      Rails.logger.info("-----#{data}")
      return data

    else
      raise "Deepgram API Error: #{response.code} - #{response.message}"
    end
  end

  private

  def parse_response(data)
    result = data.dig('results', 'channels', 0, 'alternatives', 0)

    {
      content: result['transcript'],
      speaker_labels: extract_speaker_labels(data),
      confidence: result['confidence']
    }
  end

  def extract_speaker_labels(data)
    utterances = data.dig('results', 'utterances') || []
    utterances.map do |utt|
      {
        speaker: utt['speaker'],
        start: utt['start'],
        end: utt['end'],
        text: utt['transcript']
      }
    end
  end
end