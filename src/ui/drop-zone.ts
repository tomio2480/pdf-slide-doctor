const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export interface DropZoneCallbacks {
  onFileSelected: (file: File) => void;
  onError: (message: string) => void;
}

export function createDropZone(
  container: HTMLElement,
  callbacks: DropZoneCallbacks,
): void {
  const section = document.createElement('section');
  section.id = 'drop-zone';

  const heading = document.createElement('h3');
  heading.textContent = 'PDF ファイルを選択';
  section.appendChild(heading);

  const description = document.createElement('p');
  description.textContent = 'ファイルをドラッグ＆ドロップするか、クリックして選択してください';
  section.appendChild(description);

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.pdf,application/pdf';
  fileInput.id = 'file-input';
  fileInput.style.display = 'none';
  section.appendChild(fileInput);

  const selectedInfo = document.createElement('div');
  selectedInfo.id = 'selected-file-info';
  selectedInfo.style.display = 'none';

  const fileName = document.createElement('p');
  fileName.id = 'selected-file-name';
  selectedInfo.appendChild(fileName);

  const changeButton = document.createElement('button');
  changeButton.textContent = '別のファイルを選ぶ';
  changeButton.className = 'secondary outline';
  changeButton.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });
  selectedInfo.appendChild(changeButton);

  section.appendChild(selectedInfo);

  const errorArea = document.createElement('p');
  errorArea.id = 'drop-error';
  errorArea.setAttribute('role', 'alert');
  section.appendChild(errorArea);

  function showError(message: string): void {
    errorArea.textContent = message;
    callbacks.onError(message);
  }

  function showSelectedState(file: File): void {
    heading.textContent = '📄 ' + file.name;
    description.style.display = 'none';
    selectedInfo.style.display = '';
    fileName.textContent = `${(file.size / 1024).toFixed(0)} KB`;
    section.classList.add('has-file');
  }

  function handleFile(file: File): void {
    errorArea.textContent = '';

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showError('PDF ファイルのみ対応しています');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      showError('ファイルサイズが大きすぎます（上限: 100MB）');
      return;
    }

    showSelectedState(file);
    callbacks.onFileSelected(file);
  }

  // 枠内全体をクリックでファイル選択
  section.addEventListener('click', () => {
    fileInput.click();
  });

  // dragenter/dragleave のカウンター方式で子要素バブリングによる振動を防止する
  let dragCounter = 0;

  section.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    section.setAttribute('aria-busy', 'true');
  });

  section.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  section.addEventListener('dragleave', () => {
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      section.removeAttribute('aria-busy');
    }
  });

  section.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    section.removeAttribute('aria-busy');
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
      handleFile(fileInput.files[0]);
    }
  });

  container.appendChild(section);
}
