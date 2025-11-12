export interface GoogleReviewSummary {
  rating: number;
  reviewCount: number;
  reviewSnippet: string;
  reviewerName: string;
  url: string;
  placeName: string;
  lastUpdated?: string;
}

export const GOOGLE_REVIEW_SUMMARY: GoogleReviewSummary = {
  rating: 4.8,
  reviewCount: 168,
  reviewSnippet: 'Deliciosos tacos, porciones generosas y un servicio amable que siempre invita a volver.',
  reviewerName: 'Carolina M.',
  url: 'https://maps.app.goo.gl/33cFKggmwni5JVTy7',
  placeName: 'OuiOuiTacos Barranquilla',
  lastUpdated: '2024-12-01',
};
