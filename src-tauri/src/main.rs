#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod storage;
mod decks;
mod review;
mod quiz;

fn get_data_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    storage::data_dir(app)
}

#[tauri::command]
fn list_decks(app: tauri::AppHandle) -> Result<Vec<decks::Deck>, String> {
    decks::list_decks(&get_data_dir(&app)?)
}

#[tauri::command]
fn get_deck(app: tauri::AppHandle, deck_id: String) -> Result<Option<decks::Deck>, String> {
    decks::load_deck(&get_data_dir(&app)?, &deck_id)
}

#[tauri::command]
fn create_deck(app: tauri::AppHandle, title: String, description: String) -> Result<decks::Deck, String> {
    let deck = decks::Deck::new(title, description);
    decks::save_deck(&get_data_dir(&app)?, &deck)?;
    Ok(deck)
}

#[tauri::command]
fn delete_deck(app: tauri::AppHandle, deck_id: String) -> Result<bool, String> {
    decks::delete_deck(&get_data_dir(&app)?, &deck_id)
}

#[tauri::command]
fn add_card(app: tauri::AppHandle, deck_id: String, front: String, back: String) -> Result<Option<decks::Card>, String> {
    let data_dir = get_data_dir(&app)?;
    let mut deck = match decks::load_deck(&data_dir, &deck_id)? {
        Some(d) => d,
        None => return Ok(None),
    };
    let card = deck.add_card(front, back);
    decks::save_deck(&data_dir, &deck)?;
    Ok(Some(card))
}

#[tauri::command]
fn update_card(app: tauri::AppHandle, deck_id: String, card_id: String, front: String, back: String) -> Result<bool, String> {
    let data_dir = get_data_dir(&app)?;
    if let Some(mut deck) = decks::load_deck(&data_dir, &deck_id)? {
        if deck.update_card(&card_id, front, back) {
            decks::save_deck(&data_dir, &deck)?;
            return Ok(true);
        }
    }
    Ok(false)
}

#[tauri::command]
fn remove_card(app: tauri::AppHandle, deck_id: String, card_id: String) -> Result<bool, String> {
    let data_dir = get_data_dir(&app)?;
    if let Some(mut deck) = decks::load_deck(&data_dir, &deck_id)? {
        if deck.remove_card(&card_id) {
            decks::save_deck(&data_dir, &deck)?;
            return Ok(true);
        }
    }
    Ok(false)
}

#[tauri::command]
fn get_due_cards(app: tauri::AppHandle, deck_id: String) -> Result<Vec<String>, String> {
    let data_dir = get_data_dir(&app)?;
    let deck = match decks::load_deck(&data_dir, &deck_id)? {
        Some(d) => d,
        None => return Ok(vec![]),
    };
    let review_state = review::load_review_state(&data_dir, &deck_id)?;
    let card_ids: Vec<String> = deck.cards.iter().map(|c| c.id.clone()).collect();
    Ok(review::get_due_cards(&review_state, &card_ids, 20))
}

#[tauri::command]
fn submit_rating(app: tauri::AppHandle, deck_id: String, card_id: String, rating: u8) -> Result<(), String> {
    if !(1..=4).contains(&rating) {
        return Err(format!("invalid rating: {}, must be 1-4", rating));
    }
    let data_dir = get_data_dir(&app)?;
    let mut review_state = review::load_review_state(&data_dir, &deck_id)?;
    let card_state = review_state.cards.entry(card_id).or_default();
    review::process_rating(card_state, rating);
    review::save_review_state(&data_dir, &review_state)
}

#[tauri::command]
fn get_review_state(app: tauri::AppHandle, deck_id: String) -> Result<review::DeckReviewState, String> {
    review::load_review_state(&get_data_dir(&app)?, &deck_id)
}

#[tauri::command]
fn generate_test(app: tauri::AppHandle, deck_id: String, count: Option<usize>, question_type: String) -> Result<Vec<quiz::Question>, String> {
    let data_dir = get_data_dir(&app)?;
    let deck = match decks::load_deck(&data_dir, &deck_id)? {
        Some(d) => d,
        None => return Ok(vec![]),
    };
    let qt = match question_type.as_str() {
        "multiple_choice" => quiz::QuestionType::MultipleChoice,
        "written" => quiz::QuestionType::Written,
        _ => quiz::QuestionType::MultipleChoice,
    };
    Ok(quiz::generate_questions(&deck, count, qt))
}

#[tauri::command]
fn save_test_result(app: tauri::AppHandle, result: quiz::TestResult) -> Result<(), String> {
    quiz::save_test_result(&get_data_dir(&app)?, &result)
}

#[tauri::command]
fn get_test_results(app: tauri::AppHandle, deck_id: String) -> Result<Vec<quiz::TestResult>, String> {
    quiz::load_test_results(&get_data_dir(&app)?, &deck_id)
}

#[tauri::command]
fn export_deck_csv(app: tauri::AppHandle, deck_id: String, file_path: String) -> Result<(), String> {
    decks::export_deck_csv(&get_data_dir(&app)?, &deck_id, &file_path)
}

#[tauri::command]
fn import_deck_csv(app: tauri::AppHandle, file_path: String, title: String) -> Result<decks::Deck, String> {
    decks::import_deck_csv(&get_data_dir(&app)?, &file_path, title)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            list_decks,
            get_deck,
            create_deck,
            delete_deck,
            add_card,
            update_card,
            remove_card,
            get_due_cards,
            submit_rating,
            get_review_state,
            generate_test,
            save_test_result,
            get_test_results,
            export_deck_csv,
            import_deck_csv,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
