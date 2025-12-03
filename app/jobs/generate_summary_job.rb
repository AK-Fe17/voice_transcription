class GenerateSummaryJob < ApplicationJob
  queue_as :default

  # retry_on StandardError, wait: :exponentially_longer, attempts: 5

  def perform(transcription_id)
    transcription = Transcription.find_by(id: transcription_id)
    return if transcription.content.blank?

    begin
      service = SummarizationService.new
      summary = service.summarize(transcription.content)
      

      transcription.update!(summary: summary, status: :completed)
    rescue => e
      Rails.logger.error "Failed to generate summary #{e.message}"
      # Rails.logger.error "SUMMARY ERROR >>> #{e.message}"
      # Rails.logger.error "FULL ERROR >>> #{e.full_message}"


      # if rate_limit_error?(e) || transient_error?(e)
      #   raise e
      # end

      transcription.update!(status: :completed) if transcription.processing? && transcription.summary.blank?
    end

  end

  private

  # def rate_limit_error?(error)
  #   error.message.include?("429") ||
  #   error.message.downcase.include?("rate") ||
  #   error.message.downcase.include?("limit")
  # end

  # def transient_error?(error)
  #   error.message = ~ /\b(500|502|503)\b/
  # end
end