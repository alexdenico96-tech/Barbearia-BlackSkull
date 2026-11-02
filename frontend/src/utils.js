// Funções de data usadas pelas telas (datas sempre no formato AAAA-MM-DD)

export const hojeLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const somarDias = (iso, dias) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
};

export const formatarData = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

// Segunda-feira da semana da data informada
export const inicioDaSemana = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  const diaDaSemana = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = domingo
  return somarDias(iso, -((diaDaSemana + 6) % 7));
};

const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

// [1,2,3,4,5,6] -> "seg a sáb"; [1,3,5] -> "seg, qua, sex"
export const descreverDias = (dias = []) => {
  const ordenados = [...dias].sort((a, b) => a - b);
  if (ordenados.length === 0) return '';
  const contiguos = ordenados.every((d, i) => i === 0 || d === ordenados[i - 1] + 1);
  if (contiguos && ordenados.length > 2) {
    return `${DIAS_CURTOS[ordenados[0]]} a ${DIAS_CURTOS[ordenados.at(-1)]}`;
  }
  return ordenados.map((d) => DIAS_CURTOS[d]).join(', ');
};

export const STATUS_LABEL = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado'
};
