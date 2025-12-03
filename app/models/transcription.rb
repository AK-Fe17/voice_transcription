class Transcription < ApplicationRecord
  validates :content, presence: true

  # enum status: { processing: 0, completed: 1, failed: 2 }

  after_create :generate_summary

  private

  def generate_summary
    puts "Scheduling summary generation for Transcription ID: #{self.id}"
    GenerateSummaryJob.perform_later(self.id)
  end
end
