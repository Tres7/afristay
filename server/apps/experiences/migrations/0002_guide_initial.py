"""Reprend le guide qui était écrit en dur dans la page Découvrir : la page affiche la même chose au déploiement,
puis tout se gère depuis le back-office (Expériences)."""
from django.db import migrations

U = "https://images.unsplash.com/"
Q = "?q=80&w=800&auto=format&fit=crop"

# (catégorie, nom, nom_en, étiquette, étiquette_en, ville, pays, pays_en, prix FCFA (None : gratuit), photo, description, description_en)
GUIDE = [
    ("activites", "Excursion à Ganvié", "Ganvié excursion", "Culture", "Culture", "Cotonou", "Bénin", "Benin", 15000,
     "photo-1504150558240-0b4fd8946624", "Pirogue jusqu'à la « Venise de l'Afrique », village lacustre sur le lac Nokoué.",
     "A pirogue ride to the “Venice of Africa”, a stilt village on Lake Nokoué."),
    ("activites", "Lac Rose et dunes", "Pink Lake and dunes", "Nature", "Nature", "Dakar", "Sénégal", "Senegal", 25000,
     "photo-1509099836639-18ba1795216d", "Demi-journée au lac Retba, célèbre pour sa couleur rose, et balade dans les dunes.",
     "Half a day at Lake Retba, famous for its pink water, and a walk in the dunes."),
    ("activites", "Balade en dromadaire", "Camel ride", "Aventure", "Adventure", "Marrakech", "Maroc", "Morocco", 30000,
     "photo-1539020140153-e479b8c22e70", "Coucher de soleil dans la palmeraie de Marrakech.", "Sunset in the Marrakech palm grove."),
    ("loisirs", "Plongée à Mnemba", "Diving at Mnemba", "Mer", "Sea", "Zanzibar", "Tanzanie", "Tanzania", 60000,
     "photo-1544551763-46a013bb70d5", "Snorkeling avec tortues et dauphins autour de l'atoll de Mnemba.",
     "Snorkelling with turtles and dolphins around Mnemba atoll."),
    ("loisirs", "Plage de Grand-Bassam", "Grand-Bassam beach", "Plage", "Beach", "Abidjan", "Côte d'Ivoire", "Côte d'Ivoire", None,
     "photo-1507525428034-b723cf961d3e", "Plage et ville historique classée à l'UNESCO, à 40 min d'Abidjan.",
     "A beach and UNESCO-listed historic town, 40 minutes from Abidjan."),
    ("sites", "Marché des fétiches", "Fetish market", "Culture", "Culture", "Lomé", "Togo", "Togo", 3000,
     "photo-1489392191049-fc10c97e64b6", "Le marché d'Akodessewa, lieu unique dédié à la médecine traditionnelle vaudou.",
     "Akodessewa market, a unique place devoted to traditional voodoo medicine."),
    ("sites", "Île de Gorée", "Gorée Island", "Histoire", "History", "Dakar", "Sénégal", "Senegal", 5000,
     "photo-1580746738099-b2d4b5d1d2e6", "Maison des Esclaves et ruelles colorées, à 20 min de chaloupe de Dakar.",
     "The House of Slaves and colourful lanes, 20 minutes by ferry from Dakar."),
    ("sites", "Mémorial du génocide", "Genocide Memorial", "Histoire", "History", "Kigali", "Rwanda", "Rwanda", None,
     "photo-1611348524140-53c9a25263d6", "Lieu de mémoire incontournable pour comprendre l'histoire du Rwanda.",
     "An essential place of remembrance to understand Rwanda's history."),
    ("restaurants", "Maquis de Marcory", "Marcory maquis", "Ivoirien", "Ivorian", "Abidjan", "Côte d'Ivoire", "Côte d'Ivoire", 5000,
     "photo-1555939594-58d7cb561ad1", "Poisson braisé, alloco et attiéké dans l'ambiance des maquis.",
     "Grilled fish, alloco and attiéké in the lively atmosphere of a maquis."),
    ("restaurants", "Thiéboudienne au Point E", "Thieboudienne at Point E", "Sénégalais", "Senegalese", "Dakar", "Sénégal", "Senegal", 6000,
     "photo-1604329760661-e71dc83f8f26", "Le plat national sénégalais dans une adresse familiale.",
     "Senegal's national dish in a family-run restaurant."),
    ("restaurants", "Cours de cuisine marocaine", "Moroccan cooking class", "Atelier", "Workshop", "Marrakech", "Maroc", "Morocco", 35000,
     "photo-1541518763669-27fef04b14ea", "Tajine et pâtisseries avec une cuisinière de la médina.",
     "Tagine and pastries with a cook from the medina."),
    ("loisirs", "Kakum canopy walk", "Kakum canopy walk", "Nature", "Nature", "Accra", "Ghana", "Ghana", 20000,
     "photo-1516426122078-c23e76319801", "Passerelles suspendues au-dessus de la forêt tropicale (excursion depuis Accra).",
     "Suspended walkways above the rainforest (day trip from Accra)."),
]


def installer(apps, schema_editor):
    Experience = apps.get_model('experiences', 'ExperienceModel')
    if Experience.objects.exists():
        return
    for ordre, (cat, nom, nom_en, tag, tag_en, ville, pays, pays_en, prix, photo, desc, desc_en) in enumerate(GUIDE):
        Experience.objects.create(
            categorie=cat, nom=nom, nom_en=nom_en, etiquette=tag, etiquette_en=tag_en, ville=ville, pays=pays, pays_en=pays_en,
            prix=prix, gratuit=prix is None, image_url=f"{U}{photo}{Q}", description=desc, description_en=desc_en, ordre=ordre,
        )


class Migration(migrations.Migration):
    dependencies = [('experiences', '0001_initial')]
    operations = [migrations.RunPython(installer, migrations.RunPython.noop)]
