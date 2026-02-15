-- AI prompt customization settings (one row per site)
-- Run once. These settings tailor the AI's tone, audience, and output style.

CREATE TABLE IF NOT EXISTS ai_prompt_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  site_id INT NOT NULL DEFAULT 1,
  prompt_emne VARCHAR(500) DEFAULT 'Forretningsudvikling for kreative og tidsstyring',
  prompt_kundesegment VARCHAR(500) DEFAULT 'Freelance grafiske designere, der kæmper med at finde kunder.',
  prompt_personlighed VARCHAR(500) DEFAULT 'Vittig, samtalende og let sarkastisk, som en troværdig mentor.',
  prompt_intention VARCHAR(500) DEFAULT 'Uddan læseren og få dem til at tage handling (f.eks. kontakt eller tilbud).',
  prompt_format VARCHAR(500) DEFAULT 'Professionel hjemmesidetekst. Brug korte afsnit. Undgå klichéfyldte AI-ord som ''dykke ned i'', ''tapet'', ''vidnesbyrd'' eller ''landskab''.',
  prompt_avanceret_personlighed TEXT DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by INT DEFAULT NULL,
  UNIQUE KEY idx_site_id (site_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO ai_prompt_settings (site_id, prompt_emne, prompt_kundesegment, prompt_personlighed, prompt_intention, prompt_format) VALUES
(1,
 'Forretningsudvikling for kreative og tidsstyring',
 'Freelance grafiske designere, der kæmper med at finde kunder.',
 'Vittig, samtalende og let sarkastisk, som en troværdig mentor.',
 'Uddan læseren og få dem til at tage handling (f.eks. kontakt eller tilbud).',
 'Professionel hjemmesidetekst. Brug korte afsnit. Undgå klichéfyldte AI-ord som ''dykke ned i'', ''tapet'', ''vidnesbyrd'' eller ''landskab''.')
ON DUPLICATE KEY UPDATE site_id = site_id;
