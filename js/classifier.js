// Classificador heurístico (BR/OAB) — objetivo: eliminar "Geral" e organizar por disciplina/tema/subtema.
// Observação: é heurística por texto. O ideal é o JSON já vir classificado (como nesta versão).
function norm(s){ return (s||"").toString().toLowerCase(); }

function buildText(q){
  const parts = [];
  parts.push(q.enunciado_original||"");
  const a = q.alternativas||{};
  ["A","B","C","D","E"].forEach(k=>{ if(a[k]) parts.push(a[k]); });
  const f = q.fundamentacao_legal;
  if(Array.isArray(f)) parts.push(f.join(" "));
  else if(typeof f==="string") parts.push(f);
  return parts.join(" ");
}

const DISC_RULES = [
  {disc:"Ética", w:5, re:/\b(lei\s*8\.906|8\.906\/?94|estatuto\s+da\s+advocacia|eoab|c[óo]digo\s+de\s+[ée]tica|ced\b|provimento\s+oab)\b/i},
  {disc:"Ética", w:3, re:/\b(prerrogativ|honor[áa]ri|capta[cç][aã]o\s+de\s+clientela|publicidade\s+na\s+advocacia|sigilo\s+profissional|incompatibil|impedimento)\b/i},

  {disc:"Processo Penal", w:5, re:/\b(cpp\b|c[óo]digo\s+de\s+processo\s+penal)\b/i},
  {disc:"Processo Penal", w:4, re:/\b(inqu[ée]rito|flagrante|pris[ãa]o\s+preventiva|pris[ãa]o\s+tempor[áa]ria|medidas\s+cautelares|audi[êe]ncia\s+de\s+cust[óo]dia)\b/i},
  {disc:"Processo Penal", w:3, re:/\b(habeas\s+corpus|relaxamento|liberdade\s+provis[óo]ria|fian[cç][aã]a|tribunal\s+do\s+j[úu]ri|pron[úu]ncia)\b/i},

  {disc:"Direito Penal", w:5, re:/\b(cp\b|c[óo]digo\s+penal)\b/i},
  {disc:"Direito Penal", w:3, re:/\b(tipicidade|ilicitude|culpabilidade|teoria\s+do\s+crime|concurso\s+de\s+crimes|tentativa|dolo|culpa)\b/i},
  {disc:"Direito Penal", w:2, re:/\b(homic[íi]dio|les[ãa]o\s+corporal|furto|roubo|estelionato|extors[ãa]o|amea[cç]a)\b/i},

  {disc:"Constitucional", w:5, re:/\b(cf\/?88|constitui[cç][aã]o\s+federal)\b/i},
  {disc:"Constitucional", w:4, re:/\b(adi\b|adc\b|adpf\b|controle\s+de\s+constitucionalidade)\b/i},
  {disc:"Constitucional", w:3, re:/\b(direitos\s+fundamentais|rem[ée]dios?\s+constitucionais|mandado\s+de\s+seguran[cç][aã]a|habeas\s+data|a[cç][aã]o\s+popular)\b/i},
  {disc:"Constitucional", w:2, re:/\b(minist[ée]rio\s+p[úu]blico|fun[cç][oõ]es\s+essenciais\s+[aà]\s+justi[cç]a|cnj\b|stf\b|stj\b|assembleia\s+legislativa|senado|c[âa]mara)\b/i},
  {disc:"Constitucional", w:2, re:/\b(precat[óo]rio|rpv\b|requisi[cç][aã]o\s+de\s+pequeno\s+valor|desequil[íi]brio\s+regional|redu[cç][aã]o\s+das\s+desigualdades)\b/i},

  {disc:"Administrativo", w:5, re:/\b(lei\s*14\.133|lei\s*8\.666|licita[cç][aã]o|contrato\s+administrativo)\b/i},
  {disc:"Administrativo", w:3, re:/\b(ato\s+administrativo|poder\s+de\s+pol[íi]cia|agente\s+p[úu]blico|servidor\s+p[úu]blico|improbidade|lei\s*8\.429)\b/i},
  {disc:"Administrativo", w:4, re:/\b(detran|cnh|licenciamento|transfer[êe]ncia\s+de\s+ve[íi]culo|multa\s+de\s+tr[âa]nsito|auto\s+de\s+infra[cç][aã]o)\b/i},
  {disc:"Administrativo", w:3, re:/\b(cart[óo]rio|tabeli[ãa]o|not[áa]rio|registro\s+civil|registro\s+de\s+im[óo]veis|emolumentos)\b/i},

  {disc:"Tributário", w:5, re:/\b(ctn\b|c[óo]digo\s+tribut[áa]rio)\b/i},
  {disc:"Tributário", w:4, re:/\b(execução\s+fiscal|lei\s*6\.830|d[íi]vida\s+ativa)\b/i},
  {disc:"Tributário", w:3, re:/\b(tributo|imposto|taxa|contribui[cç][aã]o|icms|iss|ipi|iptu|itcmd|ipva|lan[cç][aã]amento|cr[ée]dito\s+tribut[áa]rio)\b/i},

  {disc:"Consumidor", w:5, re:/\b(cdc\b|c[óo]digo\s+de\s+defesa\s+do\s+consumidor)\b/i},
  {disc:"Consumidor", w:3, re:/\b(consumidor|fornecedor|rela[cç][aã]o\s+de\s+consumo|v[íi]cio|fato\s+do\s+produto|procon)\b/i},

  {disc:"Direito Civil", w:5, re:/\b(c[óo]digo\s+civil|cc\b)\b/i},
  {disc:"Direito Civil", w:4, re:/\b(lgpd\b|lei\s*13\.709|dados\s+pessoais|tratamento\s+de\s+dados|controlador|operador)\b/i},
  {disc:"Direito Civil", w:3, re:/\b(div[óo]rcio|guarda|alimentos|paternidade|uni[ãa]o\s+est[áa]vel|casamento)\b/i},
  {disc:"Direito Civil", w:2, re:/\b(contrato|obriga[cç][aã]o|responsabilidade\s+civil|posse|propriedade|usucapi[ãa]o|sucess[ãa]o|testamento)\b/i},

  {disc:"Processo Civil", w:5, re:/\b(cpc\b|c[óo]digo\s+de\s+processo\s+civil|tutela\s+provis[óo]ria|cumprimento\s+de\s+senten[cç][aã]a|execu[cç][aã]o)\b/i},
  {disc:"Processo Civil", w:2, re:/\b(recurso|apela[cç][aã]o|agravo|embargos|coisa\s+julgada|compet[êe]ncia)\b/i},
  {disc:"Processo Civil", w:2, re:/\b(c[âa]mara\s+c[íi]vel|tribunal\s+de\s+justi[cç][aã]a|vara\s+c[íi]vel)\b/i},

  {disc:"Trabalho", w:5, re:/\b(clt\b|consolida[cç][aã]o\s+das\s+leis\s+do\s+trabalho)\b/i},
  {disc:"Trabalho", w:2, re:/\b(empregado|empregador|sal[áa]rio|jornada|fgts|verbas\s+rescis[óo]rias|justa\s+causa)\b/i},

  {disc:"Processo do Trabalho", w:4, re:/\b(vara\s+do\s+trabalho|audi[êe]ncia\s+una|reclamante|reclamada|rito\s+sumar[íi]ssimo|tst\b|trt\b)\b/i},

  {disc:"Empresarial", w:5, re:/\b(lei\s*11\.101|fal[êe]ncia|recupera[cç][aã]o\s+judicial)\b/i},
  {disc:"Empresarial", w:4, re:/\b(sociedade\s+limitada|limitada\s+unipessoal|eireli|junta\s+comercial|registro\s+de\s+empresas)\b/i},
  {disc:"Empresarial", w:3, re:/\b(sociedade\s+an[ôo]nima|s\.a\.|ltda|t[íi]tulos?\s+de\s+cr[ée]dito|cheque|duplicata|nota\s+promiss[óo]ria)\b/i},

  {disc:"Previdenciário", w:5, re:/\b(inss|aposentadoria|benef[íi]cio\s+previdenci[áa]rio|lei\s*8\.213|bpc\b|loas|lei\s*8\.742)\b/i},

  {disc:"Eleitoral", w:5, re:/\b(tse\b|registro\s+de\s+candidatura|propaganda\s+eleitoral|lei\s*9\.504|elei[cç][aã]o|candidato)\b/i},

  {disc:"Ambiental", w:5, re:/\b(lei\s*9\.605|crimes\s+ambientais|licenciamento\s+ambiental|meio\s+ambiente)\b/i},

  {disc:"ECA", w:5, re:/\b(eca\b|lei\s*8\.069|estatuto\s+da\s+crian[cç][aã]a\s+e\s+do\s+adolescente)\b/i},
  {disc:"ECA", w:3, re:/\b(adolescente|ato\s+infracional|medidas?\s+socioeducativas?|conselho\s+tutelar|bullying)\b/i},

  {disc:"Financeiro", w:5, re:/\b(lrf\b|lei\s+de\s+responsabilidade\s+fiscal|lei\s+complementar\s+101|loa\b|ldo\b|ppa\b|or[cç]amento\s+p[úu]blico)\b/i},

  {disc:"Internacional", w:5, re:/\b(lei\s+de\s+migra[cç][aã]o|lei\s*13\.445|visto|imigrante|estrangeiro|ref[úu]gio|extradi[cç][aã]o|nacionalidade)\b/i},

  {disc:"Direitos Humanos", w:5, re:/\b(pacto\s+de\s+s[ãa]o\s+jos[ée]|corte\s+interamericana|conven[cç][aã]o\s+americana|direitos\s+humanos)\b/i},
  {disc:"Direitos Humanos", w:3, re:/\b(pessoa\s+com\s+defici[êe]ncia|estatuto\s+da\s+pessoa\s+com\s+defici[êe]ncia|lei\s*13\.146)\b/i},

  {disc:"Filosofia do Direito", w:6, re:/\b(hans\s+kelsen|teoria\s+pura\s+do\s+direito|jusnaturalismo|positivismo\s+jur[íi]dico|hart\b|dworkin|rawls|habermas)\b/i},
];

function bestDisciplina(q){
  const text = buildText(q);
  const scores = {};
  for(const rule of DISC_RULES){
    if(rule.re.test(text)){
      scores[rule.disc] = (scores[rule.disc]||0) + rule.w;
    }
  }
  let best="Geral", bestScore=0;
  for(const [k,v] of Object.entries(scores)){
    if(v>bestScore){ best=k; bestScore=v; }
  }
  return best;
}

const THEME_RULES = {
  "Ética": [
    [/honor[áa]ri/i, "Honorários"],
    [/publicidade|capta[cç][aã]o\s+de\s+clientela/i, "Publicidade/Captação"],
    [/sigilo|inviolabilidade|prerrogativ/i, "Sigilo/Prerrogativas"],
    [/impedimento|incompatibil/i, "Impedimento/Incompatibilidade"],
    [/processo\s+disciplinar|tribunal\s+de\s+[ée]tica|san[cç][aã]o/i, "Processo disciplinar"],
  ],
  "Processo Penal": [
    [/pris[ãa]o|flagrante|preventiva|tempor[áa]ria|cautelar/i, "Prisões e cautelares"],
    [/inqu[ée]rito|investiga[cç][aã]o/i, "Inquérito"],
    [/prova|intercepta[cç][aã]o|busca\s+e\s+apreens[ãa]o/i, "Provas"],
    [/recurso|apela[cç][aã]o|embargos|habeas\s+corpus/i, "Recursos e ações"],
    [/j[úu]ri|pron[úu]ncia/i, "Tribunal do Júri"],
  ],
  "Direito Penal": [
    [/tipicidade|ilicitude|culpabilidade|tentativa|dolo|culpa|teoria\s+do\s+crime/i, "Teoria do crime"],
    [/pena|dosimetria|regime|sursis|livramento/i, "Pena"],
    [/furto|roubo|estelionato|extors[aã]o|recepta[cç][aã]o/i, "Crimes patrimoniais"],
    [/homic[íi]dio|les[ãa]o|amea[cç]a/i, "Crimes contra a pessoa"],
  ],
  "Constitucional": [
    [/direitos\s+fundamentais|garantias/i, "Direitos fundamentais"],
    [/controle\s+de\s+constitucionalidade|adi\b|adc\b|adpf\b/i, "Controle de constitucionalidade"],
    [/processo\s+legislativo/i, "Processo legislativo"],
    [/compet[êe]ncia|federa[cç][aã]o/i, "Competências/Federação"],
    [/mandado\s+de\s+seguran[cç][aã]a|habeas\s+data|a[cç][aã]o\s+popular/i, "Remédios constitucionais"],
  ],
  "Processo Civil": [
    [/contesta[cç][aã]o|prazo|cita[cç][aã]o|intima[cç][aã]o|peti[cç][aã]o\s+inicial/i, "Prazos/Atos processuais"],
    [/recurso|apela[cç][aã]o|agravo|embargos/i, "Recursos"],
    [/tutela\s+provis[óo]ria|urg[êe]ncia|evid[êe]ncia/i, "Tutelas provisórias"],
    [/execu[cç][aã]o|cumprimento\s+de\s+senten[cç][aã]a/i, "Execução/Cumprimento"],
    [/compet[êe]ncia|peti[cç][aã]o\s+inicial|procedimento/i, "Procedimento/Competência"],
  ],
  "Direito Civil": [
    [/lgpd|dados\s+pessoais/i, "Proteção de dados (LGPD)"],
    [/div[óo]rcio|guarda|alimentos|paternidade/i, "Família"],
    [/loca[cç][aã]o|locat[aá]rio|lei\s*8\.245|inquilinato/i, "Locação (Lei do Inquilinato)"],
    [/heran[cç]a|invent[aá]rio|partilha|testamento|sucess[aã]o/i, "Sucessões"],
    [/contrato|obriga[cç][aã]o/i, "Contratos/Obrigações"],
    [/responsabilidade\s+civil|dano\s+moral|indeniza[cç][aã]o/i, "Responsabilidade civil"],
    [/posse|propriedade|usucapi[ãa]o/i, "Direitos reais"],
    [/sucess[ãa]o|testamento|invent[áa]rio|heran[cç][aã]a/i, "Sucessões"],
  ],
  "Trabalho": [
    [/jornada|hora\s+extra|intervalo/i, "Jornada"],
    [/verbas\s+rescis[óo]rias|fgts|aviso\s+pr[ée]vio|f[ée]rias|13/i, "Rescisão/Verbas"],
    [/v[íi]nculo|empregado|empregador|subordina[cç][aã]o/i, "Relação de emprego"],
  ],
  "Tributário": [
    [/lan[cç][aã]amento|cr[ée]dito\s+tribut[áa]rio/i, "Crédito/Lançamento"],
    [/imunidade|isen[cç][aã]o/i, "Imunidade/Isenção"],
    [/execu[cç][aã]o\s+fiscal|d[íi]vida\s+ativa/i, "Execução fiscal"],
    [/icms|iss|ipi|iptu|ipva|itcmd/i, "Espécies tributárias"],
  ],
  "Consumidor": [
    [/v[íi]cio|garantia|fato\s+do\s+produto|defeito/i, "Vício/Fato do produto"],
    [/fornecedor|responsabilidade|invers[aã]o\s+do\s+[ôo]nus/i, "Responsabilidade/Ônus"],
    [/pr[aá]ticas?\s+abusivas?|publicidade\s+enganosa/i, "Práticas/Publicidade"],
  ],
  "Administrativo": [
    [/licita[cç][aã]o|14\.133|8\.666/i, "Licitações/Contratos"],
    [/ato\s+administrativo|poder\s+de\s+pol[íi]cia/i, "Atos/Poderes"],
    [/improbidade|8\.429/i, "Improbidade"],
    [/servidor|agente\s+p[úu]blico/i, "Agentes públicos"],
    [/detran|tr[aâ]nsito|cnh/i, "Trânsito/Detran"],
  ],
  "Empresarial": [
    [/fal[êe]ncia|recupera[cç][aã]o\s+judicial|11\.101/i, "Falência/Recuperação"],
    [/sociedade|limitada|ltda|s\.a\./i, "Sociedades"],
    [/t[íi]tulos?\s+de\s+cr[ée]dito|cheque|duplicata|nota\s+promiss[óo]ria/i, "Títulos de crédito"],
  ],
  "Internacional": [
    [/migra[cç][aã]o|visto|estrangeiro|ref[úu]gio/i, "Migração/Vistos"],
    [/extradi[cç][aã]o|nacionalidade/i, "Extradição/Nacionalidade"],
    [/tratado|conven[cç][aã]o/i, "Tratados"],
  ],
  "Filosofia do Direito": [
    [/kelsen|teoria\s+pura/i, "Positivismo/Kelsen"],
    [/hart|dworkin/i, "Positivismo vs interpretativismo"],
    [/rawls|justi[cç][aã]a/i, "Teorias da justiça"],
  ],
};

function bestTema(q, disc){
  const text = buildText(q);
  const rules = THEME_RULES[disc] || [];
  for(const [re, tema] of rules){
    if(re.test(text)) return tema;
  }
  return q.tema && q.tema!=="Geral" ? q.tema : "Geral";
}

function bestSubtema(q, disc, tema){
  // usa subtema se já veio bom
  const st = (q.subtema||"").trim();
  if(st && st.toLowerCase()!=="geral") return st;

  const text = buildText(q);
  if(tema==="Recursos"){
    if(/\bagravo\b/i.test(text)) return "Agravo";
    if(/\bapela/i.test(text)) return "Apelação";
    if(/\bembargos\b/i.test(text)) return "Embargos";
  }
  if(disc==="Ética" && tema==="Honorários"){
    if(/\bsucumb/i.test(text)) return "Sucumbenciais";
    if(/\bcontrat/i.test(text)) return "Contratuais";
  }
  if(disc==="Processo Penal" && tema==="Prisões e cautelares"){
    if(/\bflagrante\b/i.test(text)) return "Flagrante";
    if(/\bpreventiva\b/i.test(text)) return "Preventiva";
    if(/\btempor/i.test(text)) return "Temporária";
  }
  return "";
}

// Regra: se vier sem disciplina ou com "Geral", tenta classificar.
export function reclassificar(questions){
  return (questions||[]).map(q=>{
    const curDisc = q.disciplina || "Geral";
    const disc = (!q.disciplina || curDisc==="Geral" || curDisc==="Sem disciplina") ? bestDisciplina(q) : curDisc;
    const tema = (!q.tema || q.tema==="Geral") ? bestTema(q, disc) : q.tema;
    const subtema = bestSubtema(q, disc, tema);
    return {...q, disciplina: disc || "Geral", tema: tema || "Geral", subtema: subtema || ""};
  });
}
