-- Migración: agregar siglas conocidas a entidades del Estado Peruano
-- Fecha: 2026-05-12

-- Ministerios
UPDATE entidades SET sinonimos = array_append(sinonimos, 'MINEDU')
WHERE nombre_oficial ILIKE '%Ministerio de Educaci%' AND NOT (sinonimos @> ARRAY['MINEDU']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'MINSA')
WHERE nombre_oficial ILIKE '%Ministerio de Salud%' AND NOT (sinonimos @> ARRAY['MINSA']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'MEF')
WHERE nombre_oficial ILIKE '%Ministerio de Econom%' AND NOT (sinonimos @> ARRAY['MEF']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'MTC')
WHERE nombre_oficial ILIKE '%Ministerio de Transportes%' AND NOT (sinonimos @> ARRAY['MTC']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'MINEM')
WHERE nombre_oficial ILIKE '%Ministerio de Energ%' AND NOT (sinonimos @> ARRAY['MINEM']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'MINAM')
WHERE nombre_oficial ILIKE '%Ministerio del Ambiente%' AND NOT (sinonimos @> ARRAY['MINAM']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'MINDEF')
WHERE nombre_oficial ILIKE '%Ministerio de Defensa%' AND NOT (sinonimos @> ARRAY['MINDEF']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'MININTER')
WHERE nombre_oficial ILIKE '%Ministerio del Interior%' AND NOT (sinonimos @> ARRAY['MININTER']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'MINJUSDH')
WHERE nombre_oficial ILIKE '%Ministerio de Justicia%' AND NOT (sinonimos @> ARRAY['MINJUSDH']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'PRODUCE')
WHERE nombre_oficial ILIKE '%Ministerio de la Producci%' AND NOT (sinonimos @> ARRAY['PRODUCE']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'MINCETUR')
WHERE nombre_oficial ILIKE '%Comercio Exterior y Turismo%' AND NOT (sinonimos @> ARRAY['MINCETUR']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'MIDAGRI')
WHERE nombre_oficial ILIKE '%Desarrollo Agrario%' AND NOT (sinonimos @> ARRAY['MIDAGRI']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'MVCS')
WHERE nombre_oficial ILIKE '%Vivienda, Construcci%' AND NOT (sinonimos @> ARRAY['MVCS']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'MIMP')
WHERE nombre_oficial ILIKE '%Mujer y Poblaciones%' AND NOT (sinonimos @> ARRAY['MIMP']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'MIDIS')
WHERE nombre_oficial ILIKE '%Desarrollo e Inclusi%' AND NOT (sinonimos @> ARRAY['MIDIS']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'MINCUL')
WHERE nombre_oficial ILIKE '%Ministerio de Cultura%' AND NOT (sinonimos @> ARRAY['MINCUL']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'MTPE')
WHERE nombre_oficial ILIKE '%Ministerio de Trabajo%' AND NOT (sinonimos @> ARRAY['MTPE']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'PCM')
WHERE nombre_oficial ILIKE '%Presidencia del Consejo de Ministros%' AND NOT (sinonimos @> ARRAY['PCM']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'MIGRACIONES')
WHERE nombre_oficial ILIKE '%Superintendencia Nacional de Migraciones%' AND NOT (sinonimos @> ARRAY['MIGRACIONES']);

-- Organismos y entidades autónomas
UPDATE entidades SET sinonimos = array_append(sinonimos, 'EsSalud')
WHERE nombre_oficial ILIKE '%Seguro Social de Salud%' AND NOT (sinonimos @> ARRAY['EsSalud']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'SUNAT')
WHERE nombre_oficial ILIKE '%Superintendencia Nacional de Aduanas%' AND NOT (sinonimos @> ARRAY['SUNAT']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'RENIEC')
WHERE nombre_oficial ILIKE '%Registro Nacional de Identificaci%' AND NOT (sinonimos @> ARRAY['RENIEC']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'SBS')
WHERE nombre_oficial ILIKE '%Superintendencia de Banca%' AND NOT (sinonimos @> ARRAY['SBS']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'SUNARP')
WHERE nombre_oficial ILIKE '%Registros P%blicos%' AND NOT (sinonimos @> ARRAY['SUNARP']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'INDECOPI')
WHERE nombre_oficial ILIKE '%Defensa de la Competencia%' AND NOT (sinonimos @> ARRAY['INDECOPI']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'OSIPTEL')
WHERE nombre_oficial ILIKE '%Telecomunicaciones%' AND nombre_oficial ILIKE '%Supervisor%' AND NOT (sinonimos @> ARRAY['OSIPTEL']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'OSINERGMIN')
WHERE nombre_oficial ILIKE '%Energ%a y Miner%a%' AND nombre_oficial ILIKE '%Supervisor%' AND NOT (sinonimos @> ARRAY['OSINERGMIN']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'OSITRAN')
WHERE nombre_oficial ILIKE '%Infraestructura de Transporte%' AND NOT (sinonimos @> ARRAY['OSITRAN']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'SUNAFIL')
WHERE nombre_oficial ILIKE '%Fiscalizaci%n Laboral%' AND NOT (sinonimos @> ARRAY['SUNAFIL']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'SUSALUD')
WHERE nombre_oficial ILIKE '%Superintendencia Nacional de Salud%' AND NOT (sinonimos @> ARRAY['SUSALUD']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'ONP')
WHERE nombre_oficial ILIKE '%Normalizaci%n Previsional%' AND NOT (sinonimos @> ARRAY['ONP']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'COFOPRI')
WHERE nombre_oficial ILIKE '%Formalizaci%n de la Propiedad%' AND NOT (sinonimos @> ARRAY['COFOPRI']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'SERVIR')
WHERE nombre_oficial ILIKE '%Servicio Civil%' AND NOT (sinonimos @> ARRAY['SERVIR']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'CGR')
WHERE nombre_oficial ILIKE '%Contralor%a General%' AND NOT (sinonimos @> ARRAY['CGR']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'INEI')
WHERE nombre_oficial ILIKE '%Estad%stica e Inform%tica%' AND NOT (sinonimos @> ARRAY['INEI']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'CONCYTEC')
WHERE nombre_oficial ILIKE '%Ciencia, Tecnolog%a e Innovaci%n%' AND NOT (sinonimos @> ARRAY['CONCYTEC']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'PROMPERU')
WHERE nombre_oficial ILIKE '%Promoci%n del Per%' AND NOT (sinonimos @> ARRAY['PROMPERU']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'PROINVERSION')
WHERE nombre_oficial ILIKE '%Promoci%n de la Inversi%n Privada%' AND NOT (sinonimos @> ARRAY['PROINVERSION']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'OEFA')
WHERE nombre_oficial ILIKE '%Evaluaci%n y Fiscalizaci%n Ambiental%' AND NOT (sinonimos @> ARRAY['OEFA']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'SERNANP')
WHERE nombre_oficial ILIKE '%reas Naturales Protegidas%' AND NOT (sinonimos @> ARRAY['SERNANP']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'ANA')
WHERE nombre_oficial ILIKE '%Autoridad Nacional del Agua%' AND NOT (sinonimos @> ARRAY['ANA']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'SENASA')
WHERE nombre_oficial ILIKE '%Sanidad Agraria%' AND NOT (sinonimos @> ARRAY['SENASA']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'INIA')
WHERE nombre_oficial ILIKE '%Innovaci%n Agraria%' AND NOT (sinonimos @> ARRAY['INIA']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'IGP')
WHERE nombre_oficial ILIKE '%Instituto Geof%sico del Per%' AND NOT (sinonimos @> ARRAY['IGP']);

-- Poder Judicial y organismos electorales
UPDATE entidades SET sinonimos = array_append(sinonimos, 'JNE')
WHERE nombre_oficial ILIKE '%Jurado Nacional de Elecciones%' AND NOT (sinonimos @> ARRAY['JNE']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'ONPE')
WHERE nombre_oficial ILIKE '%Procesos Electorales%' AND NOT (sinonimos @> ARRAY['ONPE']);

-- Fuerzas del orden
UPDATE entidades SET sinonimos = array_append(sinonimos, 'PNP')
WHERE nombre_oficial ILIKE '%Polic%a Nacional%' AND NOT (sinonimos @> ARRAY['PNP']);

UPDATE entidades SET sinonimos = array_append(sinonimos, 'FFAA')
WHERE nombre_oficial ILIKE '%Fuerzas Armadas%' AND NOT (sinonimos @> ARRAY['FFAA']);

-- Verificar cuántas entidades recibieron siglas
SELECT COUNT(*) AS entidades_con_sinonimos
FROM entidades
WHERE array_length(sinonimos, 1) > 0;
