// About modal (was an inline <script> in index.html).
export function setupModal() {
  const modal = document.getElementById('myModal');
  const openButton = document.getElementById('open-modal-button');
  const closeButton = modal.querySelector('.close');

  openButton.addEventListener('click', () => {
    modal.style.display = 'block';
  });

  closeButton.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
}
