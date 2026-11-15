/** Fotografías y mosaicos de contexto regional. No representan la iluminación de la fecha del plan. */
export const SITE_IMAGERY: Record<string, { src: string; source: string; caption: string; position: string }> = {
  'shackleton-rim': {
    src: '/media/sites/shackleton-rim.webp', source: 'https://lroc.im-ldi.com/images/1276',
    caption: 'Fotografía oblicua de Shackleton · LROC M1407524099LR', position: '50% 45%',
  },
  'connecting-ridge': {
    src: '/media/sites/connecting-ridge.webp', source: 'https://lroc.im-ldi.com/images/1247',
    caption: 'Cresta Shackleton–de Gerlache · LROC M1348682369', position: '55% 52%',
  },
  'de-gerlache-rim': {
    src: '/media/sites/de-gerlache-rim.webp', source: 'https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_ROI_DEGERRIMLO1',
    caption: 'Mosaico fotográfico del borde de de Gerlache · NAC_ROI_DEGERRIMLO1', position: '45% 45%',
  },
  'mons-mouton': {
    src: '/media/sites/mons-mouton.webp', source: 'https://lroc.im-ldi.com/images/1401',
    caption: 'Región de alunizaje IM-2 en Mons Mouton · LROC NAC', position: '50% 50%',
  },
  'malapert-massif': {
    src: '/media/sites/malapert-massif.webp', source: 'https://lroc.im-ldi.com/images/1294',
    caption: 'Fotografía oblicua de Malapert Massif · LROC M1432398306LR', position: '52% 47%',
  },
  'nobile-rim': {
    src: '/media/sites/nobile-rim.webp', source: 'https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_ROI_MTMOUTONLO1',
    caption: 'Mosaico fotográfico de Nobile Rim 1 y Mons Mouton · NAC_ROI_MTMOUTONLO1', position: '55% 48%',
  },
}

export const SITE_IMAGE_CREDIT = 'NASA/GSFC/ASU'
